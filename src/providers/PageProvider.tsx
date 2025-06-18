import { createContext, useMemo, useState } from "react";

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
  isProjectsLoading: boolean;

  setView: (view: View) => void;
  setIsProjectsLoading: (value: boolean) => void;

  brushColor: string;
  setBrushColor: (value: string) => void;

  rgbValues: RgbValues;
  setRgbValues: (props: RgbValues) => void;

  brushSize: number;
  setBrushSize: (props: number) => void;

  processingType: "batch" | "individual";
  setProcessingType: (props: "batch" | "individual") => void;
};

const initialState: PageContextType = {
  view: "grid",
  isProjectsLoading: true,

  setView: () => {},
  setIsProjectsLoading: () => {},

  brushColor: "#000000",
  setBrushColor: () => {},

  rgbValues: { r: 0, g: 0, b: 0 },
  setRgbValues: () => {},

  brushSize: 5,
  setBrushSize: () => {},

  processingType: "batch",
  setProcessingType: () => {},
};

export const PageContext = createContext<PageContextType>(initialState);

export const PageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [view, setView] = useState<View>("grid");
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);

  const [processingType, setProcessingType] = useState<"batch" | "individual">(
    "batch"
  );

  const [brushColor, setBrushColor] = useState("#1856bf");
  const [brushSize, setBrushSize] = useState(5);
  const [rgbValues, setRgbValues] = useState<RgbValues>({
    r: 24,
    g: 86,
    b: 181,
  });

  const providerValue = useMemo(() => {
    return {
      view,
      isProjectsLoading,

      setView,
      setIsProjectsLoading,

      brushColor,
      setBrushColor,

      rgbValues,
      setRgbValues,

      brushSize,
      setBrushSize,

      processingType,
      setProcessingType,
    };
  }, [
    view,
    isProjectsLoading,
    brushColor,
    rgbValues,
    brushSize,
    processingType,
  ]);

  return (
    <PageContext.Provider value={providerValue}>
      {children}
    </PageContext.Provider>
  );
};
