import React from "react";
import { createContext } from "react";

export const PreloadContext = createContext({});

type PreloadProviderProps = {
  resolve: any;
  children: React.ReactNode;
};

export const PreloadProvider = ({
  resolve,
  children,
}: PreloadProviderProps) => {
  return (
    <PreloadContext.Provider value={resolve}>
      {children}
    </PreloadContext.Provider>
  );
};
