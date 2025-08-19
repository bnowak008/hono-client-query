import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Hono } from "hono";
import type { Client } from "./types";
import type { ReactNode } from "react";
import { createUtilsProxy } from "./utils";
import { HonoQueryContext } from "./Context";

type HonoQueryProviderProps<TApp extends Hono<any, any, any>> = {
  children: ReactNode;
  queryClient: QueryClient;
  client: Client<TApp>;
};

export const HonoQueryProvider = <TApp extends Hono<any, any, any>>({
  children,
  queryClient,
  client,
}: HonoQueryProviderProps<TApp>) => {
  const utils = createUtilsProxy<TApp>(queryClient, client);

  return (
    <QueryClientProvider client={queryClient}>
      <HonoQueryContext.Provider value={{ queryClient, utils }}>
        {children}
      </HonoQueryContext.Provider>
    </QueryClientProvider>
  );
};
