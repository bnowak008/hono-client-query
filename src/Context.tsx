import { createContext, useContext } from "react";
import type { Hono } from "hono";
import type { HonoClient, UtilsProxy } from "./types";
import type { QueryClient } from "@tanstack/react-query";

type HonoQueryContextType<TApp extends Hono<any, any, any>> = {
  queryClient: QueryClient;
  utils: UtilsProxy<HonoClient<TApp>>;
};

export const HonoQueryContext = createContext<{ queryClient: QueryClient; utils: any } | undefined>(
  undefined,
);


export const useHonoQueryContext = <TApp extends Hono<any, any, any> = any>(): HonoQueryContextType<TApp> => {
  const context = useContext(HonoQueryContext);
  if (context === undefined) {
    throw new Error(
      'useHonoQueryContext must be used within a HonoQueryProvider',
    );
  }
  return context as HonoQueryContextType<TApp>;
};
