/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNetworkConfig } from "@/hooks/contract/useNetworkConfig";
import { useWallet } from "@/hooks/contract/useWallet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModal } from "@/hooks/useModal";
import { useNonceManager } from "@/hooks/useNonceManager";
import { usePage } from "@/hooks/usePage";
import { cn } from "@/lib/utils";
import { TransactionQueue } from "@/providers/PageProvider";
import { Tooltip } from "@mui/material";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashLoader } from "react-spinners";
import { encodeFunctionData, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useReadContract } from "wagmi";
import canvasAbi from "../../../abi/canvasAbi.json";
import { FundWallet } from "./FundWallet";
import { showTransactionToast } from "./TransactionToast";

type PixelWithTimestamp = TransactionQueue & {
  timestamp: number;
  opacity: number;
};

const USER_PIXEL_FADE_DURATION = 3000; // 3 seconds

export function DrawingCanvas() {
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

  const [toolTip, setToolTip] =
    useState<Partial<TransactionQueue | null>>(null);

  // Concurrent transaction system
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentBatchRef = useRef<TransactionQueue[]>([]);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const BATCH_TIMEOUT_MS = 100;

  const { contract, chain, canvasSize } = useNetworkConfig();

  const {
    brushColor,
    brushSize,
    rgbValues,
    setPendingTx,
    setCompletedTx,
    currentTool,
    setCurrentTool,
    setRgbValues,
    setBrushColor,
    bgCanvas,
    notificationsEnabled,
  } = usePage();

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
    isNonceInitialized: nonceInitialized,
  } = useNonceManager(wallet.account?.address, publicClient);

  // Nonce initialization status tracking
  useEffect(() => {
    // Silent status tracking for nonce manager
  }, [wallet.account?.address, nonceInitialized, publicClient]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault(); // Prevent default tab behavior
        setCurrentTool(currentTool === "brush" ? "eyedropper" : "brush");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTool, setCurrentTool]);

  const { data: tilesData, refetch: refetchTiles } = useReadContract({
    abi: canvasAbi,
    address: contract,
    functionName: "getTiles",
    chainId: chain.id,
  });

  // Set up blockchain event listeners
  useEffect(() => {
    // Listen for tiles painted events
    const unwatchPainted = shredClient.watchShredEvent({
      event: parseAbiItem(
        "event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)"
      ),
      onLogs: (logs) => {
        onBlockchainUpdate(logs[0]?.args);
      },
    });

    // Listen for canvas wiped events
    const unwatchWiped = shredClient.watchShredEvent({
      event: parseAbiItem(
        "event canvasWiped(address indexed wiper, uint256 timestamp)"
      ),
      onLogs: () => {
        // When canvas is wiped, clear the blockchain pixels and refetch tiles
        setBlockchainPixels([]);
        refetchTiles();
      },
    });

    // Cleanup function to stop watching when component unmounts
    return () => {
      if (typeof unwatchPainted === "function") {
        unwatchPainted();
      }
      if (typeof unwatchWiped === "function") {
        unwatchWiped();
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

      const data = encodeFunctionData({
        abi: canvasAbi,
        functionName: "paintTiles",
        args: [tileIndices, r, g, b],
      });

      if (!account) {
        throw new Error("Account not available");
      }

      const serializedTransaction = await account.signTransaction({
        to: contract,
        data,
        nonce,
        gas: BigInt(90_000 * 20_000 * tileIndices.length),
        gasPrice: BigInt(100),
        value: BigInt(0),
        chainId: chain.id,
      });

      // Send transaction concurrently (don't await receipt)
      syncClient
        .sendRawTransactionSync({
          serializedTransaction,
        })
        .then((_receipt) => {
          // Remove confirmed pixels from user overlay (they'll appear via blockchain events)
          removeUserPixels(pixels);

          // Show transaction complete toast (only on desktop and if notifications enabled)
          const pixelCount = tileIndices.length;
          if (!isMobile && notificationsEnabled) {
            showTransactionToast(pixelCount);
          }
          setCompletedTx((prev: number) => {
            return prev + pixelCount;
          });
        })
        .catch((error) => {
          // Check if it's a nonce-related error
          const errorMessage =
            error instanceof Error
              ? error.message.toLowerCase()
              : String(error).toLowerCase();

          if (
            errorMessage.includes("nonce") ||
            errorMessage.includes("replacement")
          ) {
            resetNonce().catch(() => {});
          }

          if (errorMessage.includes("insufficient")) {
            showModal({ title: "Fund your Wallet", content: <FundWallet /> });
          }
        });
    } catch (error) {
      // Check if it's a nonce-related error
      const errorMessage =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase();

      if (errorMessage.includes("insufficient")) {
        showModal({ title: "Fund your Wallet", content: <FundWallet /> });
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

    // Blockchain update received

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

  function pickColor(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Get pixel data at clicked position
    const imageData = context.getImageData(x, y, 1, 1);
    const pixel = imageData.data;

    // Extract RGB values
    const pickedColor = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    };

    // Update brush color with picked color
    setRgbValues(pickedColor);

    // Convert RGB to hex
    const rgbToHex = (r: number, g: number, b: number) => {
      return (
        "#" +
        [r, g, b]
          .map((x) => {
            const hex = Math.max(0, Math.min(255, x)).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    };

    const hexColor = rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b);
    setBrushColor(hexColor);
    localStorage.setItem("brush-hex", hexColor);
    localStorage.setItem("brush-rgb", JSON.stringify(pickedColor));

    // Automatically switch back to brush tool after picking color
    setCurrentTool("brush");
  }

  function startDrawing({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);

    // Check current tool mode
    if (currentTool === "eyedropper") {
      pickColor(x, y);
      return;
    }

    // Brush tool behavior
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(canvas, nativeEvent);

    if (currentTool === "eyedropper") {
      const context = canvas.getContext("2d");
      if (!context) return;
      // Get pixel data at clicked position
      const imageData = context.getImageData(x, y, 1, 1);
      const data = imageData.data;

      // Extract RGB values
      const pickedColor = {
        r: data[0],
        g: data[1],
        b: data[2],
      };

      setToolTip({
        ...pickedColor,
      });
    }

    if (!isDrawing || currentTool !== "brush") return;

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

    // Check current tool mode
    if (currentTool === "eyedropper") {
      pickColor(x, y);
      return;
    }

    // Brush tool behavior
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
    if (!isDrawing || currentTool !== "brush") return;
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
    if (!buffer2Ref.current || !tilesData) return;

    const canvas = buffer2Ref.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;

    const rBuffer = Object.values((tilesData as number[])[0]);
    const gBuffer = Object.values((tilesData as number[])[1]);
    const bBuffer = Object.values((tilesData as number[])[2]);

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
  }, [tilesData, blockchainPixels]);

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
  }, [userPixels, blockchainPixels, tilesData]);

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
    console.log("bg:: ", bgCanvas.includes("bg-"));
    return () => {
      if (batchIntervalRef.current) {
        clearTimeout(batchIntervalRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex-1 flex flex-col gap-2 py-3 items-center justify-center",
        "h-full w-full"
      )}
    >
      <div
        data-hidden={!bgCanvas.includes("bg-")}
        className="absolute inset-0 bg-black/15 data-[hidden=true]:hidden"
      />
      <HashLoader
        color="white"
        size={36}
        loading={userPixels.length > 0 || currentBatchRef.current.length > 0}
        style={{ position: "absolute", bottom: 32, right: 32 }}
      />

      {/* Loading overlay with theme-aware risu-dance.gif */}
      {!tilesData && (
        <div className="absolute z-20 aspect-square w-full max-w-[820px] max-h-[820px] flex items-center justify-center bg-foreground rounded-sm border shadow-lg border-border-primary">
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/risu-dance-light.gif"
              alt="Loading canvas..."
              width={128}
              height={128}
              className="object-contain rounded-lg dark:hidden"
              unoptimized={true}
            />
            <Image
              src="/risu-dance-dark.gif"
              alt="Loading canvas..."
              width={128}
              height={128}
              className="object-contain rounded-lg hidden dark:block"
              unoptimized={true}
            />
          </div>
        </div>
      )}
      <Tooltip
        placement="right-end"
        title={
          currentTool === "eyedropper" ? (
            <div className="flex gap-2 items-center">
              <div
                className="w-8 h-8 border border-border-primary rounded"
                style={{
                  backgroundColor: `rgb(${toolTip?.r},${toolTip?.g},${toolTip?.b})`,
                }}
              />
              <p className="text-white text-sm pl-1 pr-2">
                <span className="font-bold text-white">RGB:</span> {toolTip?.r},{" "}
                {toolTip?.g}, {toolTip?.b}
              </p>
            </div>
          ) : (
            ""
          )
        }
        followCursor
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
          className={`relative z-10 touch-none aspect-square w-full max-w-[820px] max-h-[820px] rounded-sm border border-border-accent/50 dark:border-border-accent/5 bg-foreground ${
            currentTool === "eyedropper"
              ? "cursor-eyedropper"
              : "cursor-crosshair"
          }`}
          style={{
            imageRendering: "pixelated",
          }}
        />
      </Tooltip>
    </div>
  );
}
