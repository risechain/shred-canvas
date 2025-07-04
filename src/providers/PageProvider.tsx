import { useTheme } from "next-themes";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Toaster } from "sonner";

export type View = "grid" | "carousel";
export type Tool = "brush" | "eyedropper";
export type Theme = "light" | "dark" | "system";

type RgbValues = {
  r: number;
  g: number;
  b: number;
};

export type TransactionQueue = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
};

export type PageContextType = {
  isTxProcessing: boolean;
  setIsTxProcessing: (value: boolean) => void;

  brushColor: string;
  setBrushColor: (value: string) => void;

  rgbValues: RgbValues;
  setRgbValues: (props: RgbValues) => void;

  brushSize: number;
  setBrushSize: (props: number) => void;

  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;

  pendingTx: number;
  setPendingTx: Dispatch<SetStateAction<number>>;

  completedTx: number;
  setCompletedTx: Dispatch<SetStateAction<number>>;

  processingType: "batch" | "individual";
  setProcessingType: (props: "batch" | "individual") => void;

  batchSize: number;
  setBatchSize: (props: number) => void;

  realTimeTx: TransactionQueue[];
  setRealTimeTx: (props: TransactionQueue[]) => void;

  isNonceInitialized: boolean;
  setIsNonceInitialized: (value: boolean) => void;

  localNonce: number;
  setLocalNonce: Dispatch<SetStateAction<number>>;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;

  bgCanvas: string;
  setBgCanvas: (value: string) => void;
};

const initialState: PageContextType = {
  isTxProcessing: false,
  setIsTxProcessing: () => {},

  brushColor: "#000000",
  setBrushColor: () => {},

  rgbValues: { r: 0, g: 0, b: 0 },
  setRgbValues: () => {},

  brushSize: 5,
  setBrushSize: () => {},

  currentTool: "brush",
  setCurrentTool: () => {},

  pendingTx: 0,
  setPendingTx: () => {},

  completedTx: 0,
  setCompletedTx: () => {},

  processingType: "batch",
  setProcessingType: () => {},

  batchSize: 100,
  setBatchSize: () => {},

  realTimeTx: [],
  setRealTimeTx: () => {},

  isNonceInitialized: false,
  setIsNonceInitialized: () => {},

  localNonce: 0,
  setLocalNonce: () => {},

  notificationsEnabled: true,
  setNotificationsEnabled: () => {},

  bgCanvas: "",
  setBgCanvas: () => {},
};

export const PageContext = createContext<PageContextType>(initialState);

export const PageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { theme } = useTheme();

  const [isTxProcessing, setIsTxProcessing] = useState<boolean>(false);

  const [processingType, setProcessingType] = useState<"batch" | "individual">(
    "batch"
  );

  const [bgCanvas, setBgCanvas] = useState<string>("");
  const [brushColor, setBrushColor] = useState("");
  const [brushSize, setBrushSize] = useState(5);
  const [currentTool, setCurrentTool] = useState<Tool>("brush");
  const [rgbValues, setRgbValues] = useState<RgbValues>({
    r: 24,
    g: 86,
    b: 181,
  });

  const [pendingTx, setPendingTx] = useState<number>(0);
  const [completedTx, setCompletedTx] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(20);

  const [realTimeTx, setRealTimeTx] = useState<TransactionQueue[]>([]);

  const [isNonceInitialized, setIsNonceInitialized] = useState<boolean>(false);
  const [localNonce, setLocalNonce] = useState<number>(20);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // TODO: Break this into smaller chunks
  const providerValue = useMemo(() => {
    return {
      isTxProcessing,
      setIsTxProcessing,

      brushColor,
      setBrushColor,

      rgbValues,
      setRgbValues,

      brushSize,
      setBrushSize,

      currentTool,
      setCurrentTool,

      processingType,
      setProcessingType,

      pendingTx,
      setPendingTx,

      completedTx,
      setCompletedTx,

      batchSize,
      setBatchSize,

      realTimeTx,
      setRealTimeTx,

      isNonceInitialized,
      setIsNonceInitialized,

      localNonce,
      setLocalNonce,

      notificationsEnabled,
      setNotificationsEnabled,

      bgCanvas,
      setBgCanvas,
    };
  }, [
    isTxProcessing,
    brushColor,
    rgbValues,
    brushSize,
    currentTool,
    processingType,
    pendingTx,
    completedTx,
    batchSize,
    realTimeTx,
    isNonceInitialized,
    localNonce,
    notificationsEnabled,
    bgCanvas,
  ]);

  useEffect(() => {
    const initialBrushHex = localStorage.getItem("brush-hex") ?? "#1856bf";
    const initialBrushRgb = localStorage.getItem("brush-rgb");
    const initialBatchSize = localStorage.getItem("batch-size") ?? 20;
    const initialNotification =
      localStorage.getItem("wipeCanvasNotifications") === "true";

    const initialBgCanvas = localStorage.getItem("bg-canvas") ?? "default";

    setBrushColor(initialBrushHex);
    setRgbValues(initialBrushRgb ? JSON.parse(initialBrushRgb) : rgbValues);
    setBatchSize(Number(initialBatchSize));
    setNotificationsEnabled(initialNotification);
    setBgCanvas(initialBgCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContext.Provider value={providerValue}>
      <Toaster
        position="bottom-left"
        visibleToasts={3}
        expand={false}
        richColors
        closeButton
        theme={(theme ?? "system") as Theme}
      />
      {children}
    </PageContext.Provider>
  );
};
