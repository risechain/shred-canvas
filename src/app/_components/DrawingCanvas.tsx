/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWallet } from "@/hooks/contract/useWallet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModal } from "@/hooks/useModal";
import { useNonceManager } from "@/hooks/useNonceManager";
import { usePage } from "@/hooks/usePage";
import { cn } from "@/lib/utils";
import { TransactionQueue } from "@/providers/PageProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashLoader } from "react-spinners";
import { toast } from "sonner";
import { encodeFunctionData, formatEther, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { riseTestnet } from "viem/chains";
import { useBalance, useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";
import { FundWallet } from "./FundWallet";
import { useContractAddress } from "@/hooks/contract/useContractAddress";

type PixelWithTimestamp = TransactionQueue & {
  timestamp: number;
  opacity: number;
};

const USER_PIXEL_FADE_DURATION = 3000; // 3 seconds

export function DrawingCanvas() {
  const canvasSize = 64;
  const gasAllowanceRqmt = 0.000000008;

  // Canvas refs for double buffering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const buffer1Ref = useRef<HTMLCanvasElement | null>(null); // User overlay
  const buffer2Ref = useRef<HTMLCanvasElement | null>(null); // Source of truth

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [userPixels, setUserPixels] = useState<PixelWithTimestamp[]>([]); // Buffer 1 data
  const [blockchainPixels, setBlockchainPixels] = useState<TransactionQueue[]>(
    []
  ); // Buffer 2 data
  const [lastTx, setLastTx] = useState<Partial<TransactionQueue>>({
    x: 0,
    y: 0,
  });

  // Concurrent transaction system
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentBatchRef = useRef<TransactionQueue[]>([]);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const BATCH_TIMEOUT_MS = 100;

  const CONTRACT_ADDRESS = useContractAddress();

  const { brushColor, brushSize, rgbValues, setPendingTx } = usePage();

  const { showModal } = useModal();

  const {
    wallet,
    getStoredWallet,
    generateWalletClient,
    shredClient,
    syncClient,
    publicClient,
    account,
  } = useWallet();

  const isMobile = useIsMobile();

  // Initialize nonce manager
  const {
    getNextNonce,
    resetNonce,
    isInitialized: nonceInitialized,
  } = useNonceManager(wallet.account?.address, publicClient);

  // Log nonce initialization status
  useEffect(() => {
    console.log("Nonce manager status:", {
      address: wallet.account?.address,
      nonceInitialized,
      publicClientAvailable: !!publicClient,
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

  // Set up blockchain event listener once
  useEffect(() => {
    const unwatch = shredClient.watchShredEvent({
      event: parseAbiItem(
        "event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)"
      ),
      onLogs: (logs) => {
        onBlockchainUpdate(logs[0]?.args);
      },
    });

    // Cleanup function to stop watching when component unmounts
    return () => {
      if (typeof unwatch === "function") {
        unwatch();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once

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
      console.log(
        `Sending batch of ${pixels.length} pixels with nonce:`,
        nonce
      );

      const data = encodeFunctionData({
        abi: canvasAbi,
        functionName: "paintTiles",
        args: [tileIndices, r, g, b],
      });

      if (!account) {
        throw new Error("Account not available");
      }

      const serializedTransaction = await account.signTransaction({
        to: CONTRACT_ADDRESS,
        data,
        nonce,
        gas: BigInt(90_000 * 20_000 * tileIndices.length),
        gasPrice: BigInt(100),
        value: BigInt(0),
        chainId: riseTestnet.id,
      });

      // Send transaction concurrently (don't await receipt)
      syncClient
        .sendRawTransactionSync({
          serializedTransaction,
        })
        .then((_receipt) => {
          console.log(`Batch completed with ${pixels.length} pixels`);

          // Remove confirmed pixels from user overlay (they'll appear via blockchain events)
          removeUserPixels(pixels);
        })
        .catch((error) => {
          console.error("Batch transaction error:", error);

          // Check if it's a nonce-related error
          const errorMessage =
            error instanceof Error
              ? error.message.toLowerCase()
              : String(error).toLowerCase();
          if (
            errorMessage.includes("nonce") ||
            errorMessage.includes("replacement")
          ) {
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

      // Send batch - pixels stay in user overlay until transaction confirms
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

  // Buffer 1 (User Overlay) Management
  const addUserPixel = (pixel: TransactionQueue) => {
    const pixelWithTimestamp: PixelWithTimestamp = {
      ...pixel,
      timestamp: Date.now(),
      opacity: 1.0,
    };

    setUserPixels((prev) => {
      // Remove any existing pixel at the same coordinate
      const filtered = prev.filter(
        (p) => !(p.x === pixel.x && p.y === pixel.y)
      );
      return [...filtered, pixelWithTimestamp];
    });
  };

  const removeUserPixels = (pixels: TransactionQueue[]) => {
    setUserPixels((prev) =>
      prev.filter(
        (userPixel) =>
          !pixels.some(
            (batchPixel) =>
              batchPixel.x === userPixel.x && batchPixel.y === userPixel.y
          )
      )
    );
  };

  // Buffer 2 (Source of Truth) Management
  const onBlockchainUpdate = (props?: {
    indices?: readonly bigint[];
    r?: number;
    g?: number;
    b?: number;
  }) => {
    if (!props?.indices) return;

    console.log("Blockchain update received:", {
      indices: props.indices,
      color: { r: props.r, g: props.g, b: props.b },
    });

    const newPixels = props.indices.map((index) => {
      const coordinate = getCoordinatesFromIndex(Number(index));
      return {
        x: coordinate?.x ?? 0,
        y: coordinate?.y ?? 0,
        r: props.r ?? 0,
        g: props.g ?? 0,
        b: props.b ?? 0,
      };
    });

    // Show transaction complete toast (only on desktop)
    if (!isMobile) {
      const pixelCount = props.indices.length;
      toast.custom(
        (t) => (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
            style={{
              backgroundColor: "var(--purple-10)",
              color: "var(--purple-contrast)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2.5L12.5 7.5L17.5 8.5L14 12L15 17.5L10 15L5 17.5L6 12L2.5 8.5L7.5 7.5L10 2.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-medium">
              Transaction complete! {pixelCount} pixel
              {pixelCount > 1 ? "s" : ""} painted
            </span>
            <button
              onClick={() => toast.dismiss(t)}
              className="ml-auto text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ),
        {
          duration: 3000,
        }
      );
    }

    // Immediately update Buffer 2 (source of truth)
    setBlockchainPixels((prev) => {
      const updated = [...prev];
      newPixels.forEach((newPixel) => {
        // Remove any existing pixel at the same coordinate and add new one
        const index = updated.findIndex(
          (p) => p.x === newPixel.x && p.y === newPixel.y
        );
        if (index >= 0) {
          updated[index] = newPixel;
        } else {
          updated.push(newPixel);
        }
      });
      return updated;
    });

    // Remove corresponding pixels from user overlay (they're now confirmed)
    removeUserPixels(newPixels);
  };

  // Fade user pixels over time
  const updateUserPixelOpacity = () => {
    const now = Date.now();
    setUserPixels((prev) => {
      const updated = prev
        .map((pixel) => {
          const age = now - pixel.timestamp;
          const opacity = Math.max(0, 1 - age / USER_PIXEL_FADE_DURATION);
          return { ...pixel, opacity };
        })
        .filter((pixel) => pixel.opacity > 0); // Remove fully faded pixels

      return updated;
    });
  };

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

    // Add to user overlay (Buffer 1)
    addUserPixel(pixel);

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

    // Add to user overlay (Buffer 1)
    addUserPixel(pixel);

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

    // Add to user overlay (Buffer 1)
    addUserPixel(pixel);

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

    // Add to user overlay (Buffer 1)
    addUserPixel(pixel);

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

  // Initialize Buffer 2 (source of truth) from blockchain data
  const initializeBuffer2 = () => {
    if (!buffer2Ref.current || !tiles.data) return;

    const canvas = buffer2Ref.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

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

    // Apply blockchain pixel updates
    loopThruPixels(data, blockchainPixels);

    context.putImageData(imageData, 0, 0);
  };

  // Render Buffer 1 (user overlay)
  const renderBuffer1 = () => {
    if (!buffer1Ref.current) return;

    const canvas = buffer1Ref.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Clear the overlay
    context.clearRect(0, 0, canvasSize, canvasSize);

    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

    // Initialize as transparent
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = 0; // Alpha = 0 (transparent)
    }

    // Apply user pixels with fading
    userPixels.forEach((pixel) => {
      const index = coordToBufferIndex(pixel.x, pixel.y);
      const pixelIndex = index * 4;

      if (pixelIndex >= 0 && pixelIndex < data.length - 3) {
        data[pixelIndex] = pixel.r; // R
        data[pixelIndex + 1] = pixel.g; // G
        data[pixelIndex + 2] = pixel.b; // B
        data[pixelIndex + 3] = Math.floor(pixel.opacity * 255); // Alpha with fade
      }
    });

    context.putImageData(imageData, 0, 0);
  };

  // Composite both buffers to main canvas
  const renderCanvas = () => {
    if (!canvasRef.current || !buffer1Ref.current || !buffer2Ref.current)
      return;

    const mainContext = canvasRef.current.getContext("2d");
    if (!mainContext) return;

    // Clear main canvas
    mainContext.clearRect(0, 0, canvasSize, canvasSize);

    // Draw Buffer 2 (source of truth) first
    mainContext.drawImage(buffer2Ref.current, 0, 0);

    // Draw Buffer 1 (user overlay) on top
    mainContext.drawImage(buffer1Ref.current, 0, 0);
  };

  // Initialize buffers when blockchain data is available
  useEffect(() => {
    initializeBuffer2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.data, blockchainPixels]);

  // Update user overlay when user pixels change
  useEffect(() => {
    renderBuffer1();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPixels]);

  // Composite buffers to main canvas
  useEffect(() => {
    renderCanvas();
    setPendingTx(userPixels.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPixels, blockchainPixels, tiles.data]);

  // Start fade timer for user pixels
  useEffect(() => {
    fadeIntervalRef.current = setInterval(updateUserPixelOpacity, 100);
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // On initial load of the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize main canvas
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Initialize Buffer 1 (user overlay)
    const buffer1 = document.createElement("canvas");
    buffer1.width = canvasSize;
    buffer1.height = canvasSize;
    buffer1Ref.current = buffer1;

    // Initialize Buffer 2 (source of truth)
    const buffer2 = document.createElement("canvas");
    buffer2.width = canvasSize;
    buffer2.height = canvasSize;
    buffer2Ref.current = buffer2;

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
        "relative flex-1 flex flex-col gap-2 py-3 items-center justify-center h-full w-full bg-accent dark:bg-accent/35"
      )}
    >
      <HashLoader
        color="white"
        size={36}
        loading={userPixels.length > 0 || currentBatchRef.current.length > 0}
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
        className="cursor-crosshair touch-none aspect-square w-full max-w-[820px] max-h-[820px] rounded-sm border shadow-lg border-border-primary bg-foreground"
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
