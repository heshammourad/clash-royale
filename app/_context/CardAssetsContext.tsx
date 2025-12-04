"use client";

import { createContext, useContext, ReactNode } from "react";

// Define the shape of our context
type CardAssetsContextType = Record<string, string>;

// Create the context with a default empty object
const CardAssetsContext = createContext<CardAssetsContextType>({});

// Hook for child components to use
export function useCardAssets() {
  return useContext(CardAssetsContext);
}

// Provider component to wrap our app or dashboard
export function CardAssetsProvider({ 
  children, 
  images 
}: { 
  children: ReactNode; 
  images: Record<string, string>; 
}) {
  return (
    <CardAssetsContext.Provider value={images}>
      {children}
    </CardAssetsContext.Provider>
  );
}