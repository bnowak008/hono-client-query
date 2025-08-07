import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Hono } from "hono";
import type { HonoClient } from "./types";
import type { ReactNode } from "react";
import { createUtilsProxy } from "./index";
import { HonoQueryContext } from "./Context";

type HonoQueryProviderProps = {
  children: ReactNode;
  queryClient: QueryClient;
};
  
export const HonoQueryProvider = <TApp extends Hono<any, any, any>>({
  children,
  queryClient,
}: HonoQueryProviderProps) => {
  const utils = createUtilsProxy<HonoClient<TApp>>(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HonoQueryContext.Provider value={{ queryClient, utils }}>
        {children}
      </HonoQueryContext.Provider>
    </QueryClientProvider>
  );
};
