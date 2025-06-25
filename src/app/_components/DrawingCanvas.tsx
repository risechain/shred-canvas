/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWallet } from "@/hooks/contract/useWallet";
import { useModal } from "@/hooks/useModal";
import { usePage } from "@/hooks/usePage";
import { cn } from "@/lib/utils";
import { TransactionQueue } from "@/providers/PageProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashLoader } from "react-spinners";
import { formatEther, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useBalance, useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";
import { FundWallet } from "./FundWallet";
import { throttle } from "lodash";

type Transaction = {
  sentTime?: number;
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

  const {
    brushColor,
    brushSize,
    rgbValues,
    processingType,
    setCompletedTx,
    setPendingTx,
    isTxProcessing,
    setIsTxProcessing,
    batchSize,
    realTimeTx,
    setRealTimeTx,
  } = usePage();

  const { showModal } = useModal();

  const { wallet, getStoredWallet, generateWalletClient, shredClient } =
    useWallet();

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

  const throttledTx = throttle(processTx, 200);

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

  async function processTx() {
    console.log("txQueue:: ", txQueue);
    if (isTxProcessing || !client || txQueue.length === 0) return;

    setIsTxProcessing(true);
    const queue = [...txQueue];

    const { r, g, b } = txQueue[0];

    console.log("txQueue:: ", txQueue);
    console.log("processing...");

    const tileIndices = queue.map((tx) => tx.x * canvasSize + tx.y);

    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: canvasAbi,
        functionName: "paintTiles",
        args: [tileIndices, r, g, b],
      });

      if (txHash) {
        const completedTx = [...sentTransactions.transactions, ...txQueue];
        setSentTransactions({
          sentTime: Date.now(),
          transactions: completedTx,
        });
        setTxQueue((prev) => prev.slice(tileIndices.length));
      }
      console.log("processing completed...");
    } catch (e) {
      console.error("Error!", e);
      const accountBalance = formatEther(balance?.data?.value ?? 0n);
      if (gasAllowanceRqmt > Number(accountBalance)) {
        showModal({ content: <FundWallet />, title: "Embedded Wallet" });
      }
    }

    setIsTxProcessing(false);

    console.log("==============================================");
  }

  function startDrawing({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);

    setTxQueue((prev) => [
      ...prev,
      {
        x,
        y,
        r: rgbValues.r,
        g: rgbValues.g,
        b: rgbValues.b,
      },
    ]);
    setIsDrawing(true);
  }

  async function stopDrawing() {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    await processTx();
    // throttledTx.cancel();
  }

  function draw({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    throttledTx();

    const canvas = canvasRef.current;

    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);
    // Do not remove this -- this will prevent from adding duplicating coordinates in txQueue
    if (lastTx.x === x && lastTx.y === y) return;

    setLastTx({
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    });

    // Add transaction to queue (no direct drawing on canvas)
    setTxQueue((prev) => [
      ...prev,
      {
        x,
        y,
        r: rgbValues.r,
        g: rgbValues.g,
        b: rgbValues.b,
      },
    ]);
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

    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
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

    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // Add to transaction queue instead of direct drawing
    setTxQueue((prev) => [
      ...prev,
      {
        x: Math.floor(x),
        y: Math.floor(y),
        r: rgbValues.r,
        g: rgbValues.g,
        b: rgbValues.b,
      },
    ]);
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

    // Start with base canvas data
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

    // Apply sent transactions overlay
    loopThruPixels(data, sentTransactions.transactions);

    // Apply pending transactions overlay (highest priority)
    loopThruPixels(data, txQueue);

    // Apply real time updates
    realTimeTx.entries().forEach((item) => {
      loopThruPixels(data, item[1]);
    });

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

  return (
    <div
      className={cn(
        "relative flex-1 flex flex-col gap-2 py-3 items-center justify-center h-full w-full bg-foreground/75 dark:bg-accent/35"
      )}
    >
      <HashLoader
        color="white"
        size={36}
        loading={isTxProcessing}
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
