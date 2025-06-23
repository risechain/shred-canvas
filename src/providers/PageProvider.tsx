import { createContext, useEffect, useMemo, useState } from "react";

export type View = "grid" | "carousel";

type RgbValues = {
  r: number;
  g: number;
  b: number;
};

export type PageContextType = {
  /**
   * Project view: type "grid" | "carousel"
   * For Apps and Build page
   */
  view: View;
  setView: (view: View) => void;

  isTxProcessing: boolean;
  setIsTxProcessing: (value: boolean) => void;

  brushColor: string;
  setBrushColor: (value: string) => void;

  rgbValues: RgbValues;
  setRgbValues: (props: RgbValues) => void;

  brushSize: number;
  setBrushSize: (props: number) => void;

  pendingTx: number;
  setPendingTx: (props: number) => void;

  completedTx: number;
  setCompletedTx: (props: number) => void;

  processingType: "batch" | "individual";
  setProcessingType: (props: "batch" | "individual") => void;

  batchSize: number;
  setBatchSize: (props: number) => void;
};

const initialState: PageContextType = {
  view: "grid",
  setView: () => {},

  isTxProcessing: false,
  setIsTxProcessing: () => {},

  brushColor: "#000000",
  setBrushColor: () => {},

  rgbValues: { r: 0, g: 0, b: 0 },
  setRgbValues: () => {},

  brushSize: 5,
  setBrushSize: () => {},

  pendingTx: 5,
  setPendingTx: () => {},

  completedTx: 5,
  setCompletedTx: () => {},

  processingType: "batch",
  setProcessingType: () => {},

  batchSize: 100,
  setBatchSize: () => {},
};

export const PageContext = createContext<PageContextType>(initialState);

export const PageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [view, setView] = useState<View>("grid");
  const [isTxProcessing, setIsTxProcessing] = useState<boolean>(false);

  const [processingType, setProcessingType] = useState<"batch" | "individual">(
    "batch"
  );

  const [brushColor, setBrushColor] = useState("");
  const [brushSize, setBrushSize] = useState(5);
  const [rgbValues, setRgbValues] = useState<RgbValues>({
    r: 24,
    g: 86,
    b: 181,
  });

  const [pendingTx, setPendingTx] = useState(0);
  const [completedTx, setCompletedTx] = useState(0);
  const [batchSize, setBatchSize] = useState(20);

  const providerValue = useMemo(() => {
    return {
      view,
      setView,

      isTxProcessing,
      setIsTxProcessing,

      brushColor,
      setBrushColor,

      rgbValues,
      setRgbValues,

      brushSize,
      setBrushSize,

      processingType,
      setProcessingType,

      pendingTx,
      setPendingTx,

      completedTx,
      setCompletedTx,

      batchSize,
      setBatchSize,
    };
  }, [
    view,
    isTxProcessing,
    brushColor,
    rgbValues,
    brushSize,
    processingType,
    pendingTx,
    completedTx,
    batchSize,
  ]);

  useEffect(() => {
    const initialBrushHex = localStorage.getItem("brush-hex") ?? "#1856bf";
    const initialBrushRgb = localStorage.getItem("brush-rgb");
    const initialBatchSize = localStorage.getItem("batch-size") ?? 20;

    setBrushColor(initialBrushHex);
    setRgbValues(initialBrushRgb ? JSON.parse(initialBrushRgb) : rgbValues);
    setBatchSize(Number(initialBatchSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContext.Provider value={providerValue}>
      {children}
    </PageContext.Provider>
  );
};
