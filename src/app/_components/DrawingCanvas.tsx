/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWallet } from "@/hooks/contract/useWallet";
import { usePage } from "@/hooks/usePage";
import { cn } from "@/lib/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { privateKeyToAccount } from "viem/accounts";
import { useReadContract, useTransactionCount } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";

type TransactionQueue = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
};

type Transaction = {
  sentTime?: number;
  transactions: TransactionQueue[];
};

const CONTRACT_ADDRESS = "0xF8557708e908CBbBD3DB3581135844d49d61E2a8";

export function DrawingCanvas() {
  const canvasSize = 64;
  const batchSize = 50;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [txQueue, setTxQueue] = useState<TransactionQueue[]>([]);
  const [lastTx, setLastTx] = useState<Partial<TransactionQueue>>({
    x: 0,
    y: 0,
  });

  const [sentTransactions, setSentTransactions] = useState<Transaction>({
    transactions: [],
  });

  const {
    brushColor,
    brushSize,
    rgbValues,
    processingType,
    setCompletedTx,
    setPendingTx,
  } = usePage();

  const tiles = useReadContract({
    abi: canvasAbi,
    address: CONTRACT_ADDRESS,
    functionName: "getTiles",
  });

  const { wallet, getStoredWallet, generateWalletClient } = useWallet();

  const transaction = useTransactionCount({ address: wallet.account.address });

  const client = useMemo(() => {
    if (!getStoredWallet()?.privateKey) return;

    const account = privateKeyToAccount(getStoredWallet()?.privateKey ?? "");
    const client = generateWalletClient(account);

    return client;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStoredWallet()?.privateKey]);

  /**
   * Process transaction individually
   * 1. Send transaction onStopDrawing
   * 2. each stop will be in one batch
   */
  const processTx = async () => {
    if (isProcessingQueue || !client || txQueue.length === 0) return;

    setIsProcessingQueue(true);

    const { r, g, b } = txQueue[0];

    console.log("txQueue:: ", txQueue);
    console.log("processing...");

    const tileIndices = txQueue.map((tx) => tx.x * canvasSize + tx.y);

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      abi: canvasAbi,
      functionName: "paintTiles",
      args: [tileIndices, r, g, b],
    });

    if (txHash) {
      const completedTx = [...sentTransactions.transactions, ...txQueue];
      setSentTransactions({ sentTime: Date.now(), transactions: completedTx });
      setTxQueue([]);
      setIsProcessingQueue(false);
    }

    console.log("processing completed...");
    console.log("==============================================");
  };

  const startDrawing = ({
    nativeEvent,
  }: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) return;
    // const rect = canvas.getBoundingClientRect();
    // const scaleX = canvas.width / rect.width;
    // const scaleY = canvas.height / rect.height;

    // const x = (nativeEvent.clientX - rect.left) * scaleX;
    // const y = (nativeEvent.clientY - rect.top) * scaleY;

    // if (!contextRef.current) return;
    // contextRef.current.beginPath();
    // contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const stopDrawing = async () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    await processTx();
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    // console.log("drawing...");

    const canvas = canvasRef.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((nativeEvent.x - rect.left) * scaleX);
    const y = Math.floor((nativeEvent.y - rect.top) * scaleY);

    // console.log({
    //   x,
    //   y,
    //   r: rgbValues.r,
    //   g: rgbValues.g,
    //   b: rgbValues.b,
    // });

    if (lastTx.x === x && lastTx.y === y) return;

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

    setLastTx({
      x,
      y,
      r: rgbValues.r,
      g: rgbValues.g,
      b: rgbValues.b,
    });
  };

  const touchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
  };

  const touchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
  };

  const coordToBufferIndex = (x: number, y: number) => {
    return Math.floor(y) * canvasSize + Math.floor(x);
  };

  const renderCanvas = () => {
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
    sentTransactions.transactions.forEach((tx) => {
      const index = coordToBufferIndex(tx.x, tx.y);
      const pixelIndex = index * 4;

      data[pixelIndex] = tx.r; // R
      data[pixelIndex + 1] = tx.g; // G
      data[pixelIndex + 2] = tx.b; // B
      data[pixelIndex + 3] = 255; // Alpha
    });

    // Apply pending transactions overlay (highest priority)
    txQueue.forEach((tx) => {
      const index = coordToBufferIndex(tx.x, tx.y);
      const pixelIndex = index * 4;

      data[pixelIndex] = tx.r; // R
      data[pixelIndex + 1] = tx.g; // G
      data[pixelIndex + 2] = tx.b; // B
      data[pixelIndex + 3] = 255; // Alpha
    });

    // Update the canvas
    context.fill();
    context.putImageData(imageData, 0, 0);
  };

  // Modified queue processor to move processed transactions to sentTransactions
  // useEffect(() => {
  //   if (!wallet) return;

  //   const processQueue = async () => {
  //     if (isProcessingQueue || txQueue.length === 0) return;

  //     // setIsProcessingQueue(true);

  //     try {
  //       // Call the appropriate processing function based on the batchTxs flag
  //       if (processingType === "individual") {
  //         // await processTransaction();
  //       } else {
  //         // await processIndividualApproach();
  //       }
  //     } catch (error) {
  //       console.error("Error processing transaction batch:", error);
  //     } finally {
  //       // setIsProcessingQueue(false);
  //     }
  //   };

  //   // Process queue every 50ms
  //   // const interval = setInterval(processQueue, 50);
  //   // return () => clearInterval(interval);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [lastTx?.x, lastTx?.y]);

  // New effect to cleanup old sent transactions after 2 seconds
  // useEffect(() => {
  //   if (sentTransactions.length === 0) return;

  //   const cleanupInterval = setInterval(() => {
  //     const now = Date.now();

  //     // Remove transactions older than 5 seconds
  //     setSentTransactions((prev) =>
  //       prev.filter((tx) => now - tx.sentTime < 7500)
  //     );
  //   }, 250); // Check every 250ms

  //   return () => clearInterval(cleanupInterval);
  // }, [sentTransactions]);

  // Effect to render canvas whenever any of the layers change
  useEffect(() => {
    renderCanvas();
    setCompletedTx(sentTransactions.transactions.length);
    setPendingTx(txQueue.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.data, txQueue, sentTransactions]);

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
        "flex-1 flex items-center justify-center h-full w-full bg-foreground/75 dark:bg-accent/35"
      )}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={stopDrawing}
        className="cursor-crosshair touch-none aspect-square w-full max-w-[820px] max-h-[820px]"
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
