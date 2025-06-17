import { createContext, useMemo, useState } from "react";

export type View = "grid" | "carousel";

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
};

const initialState: PageContextType = {
  view: "grid",
  isProjectsLoading: true,

  setView: () => {},
  setIsProjectsLoading: () => {},

  brushColor: "#000000",
  setBrushColor: () => {},
};

export const PageContext = createContext<PageContextType>(initialState);

export const PageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [view, setView] = useState<View>("grid");
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);
  const [brushColor, setBrushColor] = useState("#000000");

  const providerValue = useMemo(() => {
    return {
      view,
      isProjectsLoading,

      setView,
      setIsProjectsLoading,

      brushColor,
      setBrushColor,
    };
  }, [view, isProjectsLoading, brushColor]);

  return (
    <PageContext.Provider value={providerValue}>
      {children}
    </PageContext.Provider>
  );
};
