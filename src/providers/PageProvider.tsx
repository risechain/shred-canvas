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
};

export const PageContext = createContext<PageContextType>(initialState);

export const PageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [view, setView] = useState<View>("grid");
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [rgbValues, setRgbValues] = useState<RgbValues>({ r: 0, g: 0, b: 0 });

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
    };
  }, [view, isProjectsLoading, brushColor, rgbValues, brushSize]);

  return (
    <PageContext.Provider value={providerValue}>
      {children}
    </PageContext.Provider>
  );
};
