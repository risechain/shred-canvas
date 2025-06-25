/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWallet } from "@/hooks/contract/useWallet";
import { useModal } from "@/hooks/useModal";
import { usePage } from "@/hooks/usePage";
import { useNonceManager } from "@/hooks/useNonceManager";
import { cn } from "@/lib/utils";
import { TransactionQueue } from "@/providers/PageProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashLoader } from "react-spinners";
import { encodeFunctionData, formatEther, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useBalance, useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";
import { FundWallet } from "./FundWallet";
import { riseTestnet } from "viem/chains";

type Transaction = {
  blockNumber?: number;
  transactions: TransactionQueue[];
};

const CONTRACT_ADDRESS = "0xF8557708e908CBbBD3DB3581135844d49d61E2a8";

export function DrawingCanvas() {
  const canvasSize = 64;
  const gasAllowanceRqmt = 0.000000008;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [txQueue, setTxQueue] = useState<TransactionQueue[]>([]);
  const [lastTx, setLastTx] = useState<Partial<TransactionQueue>>({
    x: 0,
    y: 0,
  });
  const [sentTransactions, setSentTransactions] = useState<Transaction>({
    transactions: [],
  });

  const uniqueBlocks = new Set<number>();
  const [blockNumber, setBlockNumber] = useState(uniqueBlocks);

  // Concurrent transaction system
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentBatchRef = useRef<TransactionQueue[]>([]);
  const BATCH_TIMEOUT_MS = 100;

  const {
    brushColor,
    brushSize,
    rgbValues,
    setCompletedTx,
    setPendingTx,
    realTimeTx,
    setRealTimeTx,
  } = usePage();

  const { showModal } = useModal();

  const { wallet, getStoredWallet, generateWalletClient, shredClient, syncClient } =
    useWallet();


  // Initialize nonce manager
  const { getNextNonce, resetNonce, isInitialized: nonceInitialized } = 
    useNonceManager(wallet.account?.address, publicClient);

  // Log nonce initialization status
  useEffect(() => {
    console.log('Nonce manager status:', {
      address: wallet.account?.address,
      nonceInitialized,
      publicClientAvailable: !!publicClient
    });
  }, [wallet.account?.address, nonceInitialized, publicClient]);

  const tiles = useReadContract({
    abi: canvasAbi,
    address: CONTRACT_ADDRESS,
    functionName: "getTiles",
  });


  const balance = useBalance({
    address: wallet.account.address,
  });

  shredClient.watchShredEvent({
    event: parseAbiItem(
      "event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)"
    ),
    onLogs: (logs) => {
      const blockNumber = Number(logs[0]?.blockNumber);
      uniqueBlocks.add(blockNumber);
      setBlockNumber(uniqueBlocks);

      onRealTimeUpdate(blockNumber, logs[0]?.args);
    },
  });

  const client = useMemo(() => {
    if (!getStoredWallet()?.privateKey) return;

    const account = privateKeyToAccount(getStoredWallet()?.privateKey ?? "");
    const client = generateWalletClient(account);

    return client;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStoredWallet()?.privateKey]);

  // Concurrent transaction processing
  const sendBatch = async (pixels: TransactionQueue[]) => {
    if (!client || !nonceInitialized || pixels.length === 0) return;

    const { r, g, b } = pixels[0];
    const tileIndices = pixels.map((tx) => tx.x * canvasSize + tx.y);

    try {
      // Get the next nonce for this transaction
      const nonce = getNextNonce();
      console.log(`Sending batch of ${pixels.length} pixels with nonce:`, nonce);

      const data = encodeFunctionData({
        abi: canvasAbi,
        functionName: 'paintTiles',
        args: [tileIndices, r, g, b],
      });

      const serializedTransaction = await client.signTransaction({
        to: CONTRACT_ADDRESS,
        data,
        nonce,
        gas: BigInt(90_000 * 20_000 * tileIndices.length),
        gasPrice: BigInt(100),
        value: BigInt(0),
        chainId: riseTestnet.id,
      });

      // Send transaction concurrently (don't await receipt)
      syncClient.sendRawTransactionSync({
        serializedTransaction,
      }).then((receipt) => {
        console.log(`Batch completed with ${pixels.length} pixels`);
        
        // Remove confirmed pixels from visual queue
        setTxQueue(prev => prev.filter(px => 
          !pixels.some(batchPx => batchPx.x === px.x && batchPx.y === px.y)
        ));
        
        // Update sent transactions
        setSentTransactions(prev => ({
          blockNumber: Number(receipt.blockNumber),
          transactions: [...prev.transactions, ...pixels],
        }));
      }).catch((error) => {
        console.error("Batch transaction error:", error);
        
        // Check if it's a nonce-related error
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (errorMessage.includes('nonce') || errorMessage.includes('replacement')) {
          console.warn("Nonce conflict detected, resetting nonce manager");
          resetNonce().catch(console.error);
        }
      });

    } catch (e) {
      console.error("Transaction signing error:", e);
      const accountBalance = formatEther(balance?.data?.value ?? 0n);
      if (gasAllowanceRqmt > Number(accountBalance)) {
        showModal({ content: <FundWallet />, title: "Embedded Wallet" });
      }
    }
  };

  const flushCurrentBatch = () => {
    if (currentBatchRef.current.length > 0) {
      const batch = [...currentBatchRef.current];
      currentBatchRef.current = [];
      
      // Send batch - pixels stay in txQueue until transaction confirms
      sendBatch(batch);
    }
  };

  const addPixelToBatch = (pixel: TransactionQueue) => {
    // Add to current batch
    currentBatchRef.current.push(pixel);
    
    // Start timer if not already running
    if (!batchIntervalRef.current) {
      batchIntervalRef.current = setTimeout(() => {
        flushCurrentBatch();
        batchIntervalRef.current = null;
      }, BATCH_TIMEOUT_MS);
    }
  };

  function onRealTimeUpdate(
    blockNumber: number,
    props?: {
      indices?: readonly bigint[];
      r?: number;
      g?: number;
      b?: number;
    }
  ) {
    if (!props?.indices) return;
    const txList = props?.indices?.map((index) => {
      const coordinate = getCoordinatesFromIndex(Number(index));

      return {
        x: coordinate?.x ?? 0,
        y: coordinate?.y ?? 0,
        r: props.r ?? 0,
        g: props.g ?? 0,
        b: props.b ?? 0,
      };
    });

    realTimeTx.set(blockNumber, txList);
    setRealTimeTx(realTimeTx);
  }

  function getCoordinatesFromIndex(index: number) {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const width = canvas.width;

    const y = index % width;
    const x = Math.floor(index / width);
    return { x, y };
  }

  function getCoordinates(canvas: HTMLCanvasElement, nativeEvent: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((nativeEvent.x - rect.left) * scaleX);
    const y = Math.floor((nativeEvent.y - rect.top) * scaleY);

    return { x, y };
  }


  function startDrawing({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);

    const pixel = {
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    };

    // Add to visual queue
    setTxQueue(prev => [...prev, pixel]);
    
    // Add to batch for processing
    addPixelToBatch(pixel);
    
    setIsDrawing(true);
  }

  async function stopDrawing() {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    
    // Clear the batch timer and immediately flush current batch
    if (batchIntervalRef.current) {
      clearTimeout(batchIntervalRef.current);
      batchIntervalRef.current = null;
    }
    
    // Immediately send any pixels that are waiting
    flushCurrentBatch();
  }

  function draw({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;

    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);
    
    // Do not remove this -- this will prevent from adding duplicating coordinates in txQueue
    if (lastTx.x === x && lastTx.y === y) return;

    const pixel = {
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    };

    setLastTx(pixel);

    // Add to visual queue
    setTxQueue(prev => [...prev, pixel]);
    
    // Add to batch for processing
    addPixelToBatch(pixel);
  }

  // TODO: merge this widh touchStart and touchMove
  function touchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((touch.clientX - rect.left) * scaleX);
    const y = Math.floor((touch.clientY - rect.top) * scaleY);

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    
    const pixel = {
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    };

    // Add to visual queue
    setTxQueue(prev => [...prev, pixel]);
    
    // Add to batch for processing
    addPixelToBatch(pixel);
    
    setIsDrawing(true);
  }

  function touchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((touch.clientX - rect.left) * scaleX);
    const y = Math.floor((touch.clientY - rect.top) * scaleY);

    const pixel = {
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    };

    // Add to visual queue
    setTxQueue(prev => [...prev, pixel]);
    
    // Add to batch for processing
    addPixelToBatch(pixel);
  }

  function coordToBufferIndex(x: number, y: number) {
    return Math.floor(y) * canvasSize + Math.floor(x);
  }

  function loopThruPixels(
    data: Uint8ClampedArray<ArrayBufferLike>,
    transactions: TransactionQueue[]
  ) {
    transactions.forEach((tx) => {
      const index = coordToBufferIndex(tx.x, tx.y);
      const pixelIndex = index * 4;

      data[pixelIndex] = tx.r; // R
      data[pixelIndex + 1] = tx.g; // G
      data[pixelIndex + 2] = tx.b; // B
      data[pixelIndex + 3] = 255; // Alpha
    });
  }

  function renderCanvas() {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;
    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

    if (!tiles.data) return;
    const rBuffer = Object.values((tiles.data as number[])[0]);
    const gBuffer = Object.values((tiles.data as number[])[1]);
    const bBuffer = Object.values((tiles.data as number[])[2]);

    // Map buffer values to canvas pixels
    for (let i = 0; i < canvasSize * canvasSize; i++) {
      const x = Math.floor(i / canvasSize);
      const y = i % canvasSize;
      const index = (y * canvasSize + x) * 4;

      data[index] = Number(rBuffer[i]); // R
      data[index + 1] = Number(gBuffer[i]); // G
      data[index + 2] = Number(bBuffer[i]); // B
      data[index + 3] = 255; // Alpha
    }

    // console.log("sentTransactions:: ", sentTransactions);


    loopThruPixels(data, sentTransactions.transactions);

    // Apply real time updates
    realTimeTx.entries().forEach((item) => {
      // if (item[0] > (sentTransactions.blockNumber ?? 0)) {
      // }
      loopThruPixels(data, item[1]);
    });

    // Apply pending transactions overlay (highest priority)
    loopThruPixels(data, txQueue);

    // Update the canvas
    context.fill();
    context.putImageData(imageData, 0, 0);
  }

  // Effect to render canvas whenever any of the layers change
  useEffect(() => {
    renderCanvas();
    setCompletedTx(sentTransactions.transactions.length);
    setPendingTx(txQueue.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.data, txQueue, sentTransactions, blockNumber.size]);

  // On initial load of the canvas
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;

    context.fillRect(0, 0, canvas.width, canvas.height);

    contextRef.current = context;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup batch timer on unmount
  useEffect(() => {
    return () => {
      if (batchIntervalRef.current) {
        clearTimeout(batchIntervalRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex-1 flex flex-col gap-2 py-3 items-center justify-center h-full w-full bg-foreground/75 dark:bg-accent/35"
      )}
    >
      <HashLoader
        color="white"
        size={36}
        loading={txQueue.length > 0 || currentBatchRef.current.length > 0}
        style={{ position: "absolute", bottom: 32, right: 32 }}
      />
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={stopDrawing}
        className="border border-border-primary cursor-crosshair touch-none aspect-square w-full max-w-[820px] max-h-[820px]"
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
