/* eslint-disable @typescript-eslint/no-unused-vars */
import { usePage } from "@/hooks/usePage";
import { useEffect, useRef, useState } from "react";
import { useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";
import { cn } from "@/lib/utils";

type TransactionQueue = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
};

type Transaction = TransactionQueue & {
  sentTime: number;
};

const CONTRACT_ADDRESS = "0xf7d0a6C2c2f653e762DEc942Fc727f10d103cB87";

export function DrawingCanvas() {
  const canvasSize = 64;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [rgbValues, setRgbValues] = useState({ r: 0, g: 0, b: 0 });

  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [txQueue, setTxQueue] = useState<TransactionQueue[]>([]);
  const [sentTransactions, setSentTransactions] = useState<Transaction[]>([]);

  const { brushColor, brushSize } = usePage();

  const tiles = useReadContract({
    abi: canvasAbi,
    address: CONTRACT_ADDRESS,
    functionName: "getTiles",
  });

  const startDrawing = ({
    nativeEvent,
  }: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (nativeEvent.clientX - rect.left) * scaleX;
    const y = (nativeEvent.clientY - rect.top) * scaleY;

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    // if (!isDrawing || !contract || !wallet) return;

    const canvas = canvasRef.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((nativeEvent.clientX - rect.left) * scaleX);
    const y = Math.floor((nativeEvent.clientY - rect.top) * scaleY);

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

    console.log("canvasRef:: ", canvasRef);

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;
    console.log("context:: ", context);
    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

    console.log("imageData:: ", imageData);

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
    console.log("data:: ", data);

    // Apply sent transactions overlay
    console.log("sentTransactions:: ", sentTransactions);
    sentTransactions.forEach((tx) => {
      const index = coordToBufferIndex(tx.x, tx.y);
      const pixelIndex = index * 4;

      data[pixelIndex] = tx.r; // R
      data[pixelIndex + 1] = tx.g; // G
      data[pixelIndex + 2] = tx.b; // B
      data[pixelIndex + 3] = 255; // Alpha
    });

    console.log("txQueue:: ", txQueue);
    // Apply pending transactions overlay (highest priority)
    txQueue.forEach((tx) => {
      const index = coordToBufferIndex(tx.x, tx.y);
      const pixelIndex = index * 4;

      console.log("tx:: ", tx);

      data[pixelIndex] = tx.r; // R
      data[pixelIndex + 1] = tx.g; // G
      data[pixelIndex + 2] = tx.b; // B
      data[pixelIndex + 3] = 255; // Alpha
    });

    // Update the canvas
    context.fill();
    context.putImageData(imageData, 0, 0);
  };

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

  // Update context when brush properties change
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = brushColor;
      contextRef.current.lineWidth = brushSize;
    }
  }, [brushColor, brushSize]);

  // New effect to cleanup old sent transactions after 2 seconds
  useEffect(() => {
    if (sentTransactions.length === 0) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Remove transactions older than 5 seconds
      setSentTransactions((prev) =>
        prev.filter((tx) => now - tx.sentTime < 7500)
      );
    }, 250); // Check every 250ms

    return () => clearInterval(cleanupInterval);
  }, [sentTransactions]);

  // Convert hex color to RGB
  useEffect(() => {
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    setRgbValues(hexToRgb(brushColor));
  }, [brushColor]);

  // Effect to render canvas whenever any of the layers change
  useEffect(() => {
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.data, txQueue, sentTransactions]);

  return (
    <div
      className={cn(
        "flex-1 h-full w-full bg-foreground/75 dark:bg-accent/35"
        // "relative before:absolute before:inset-0 before:bg-[linear-gradient(to_right,var(--gray-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--gray-6)_1px,transparent_1px)] before:bg-[size:20px_20px]"
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
        className="cursor-crosshair touch-none h-full mx-auto relative z-10"
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
