import { createContext, useContext } from 'react';

export const StateContext = createContext(null);

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within a StateContext.Provider');
  }
  return ctx;
}
