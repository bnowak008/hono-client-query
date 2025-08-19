import type { Hono } from "hono";
import type { Client } from "./types";
import type { QueryClient } from "@tanstack/react-query";
import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { HonoQueryError } from "./error";

export const createUtilsProxy = <TApp extends Hono<any, any, any>>(
  queryClient: QueryClient,
  client: Client<TApp>,
  path: string[] = [],
) => {
  return new Proxy(
    {},
    {
      get: (_target, property: string) => {
        if (property === 'invalidate') {
          return (input: any) =>
            queryClient.invalidateQueries({
              queryKey: input ? [...path, input] : path,
            });
        }
        if (property === 'getData') {
          return (input?: unknown) =>
            queryClient.getQueryData(input ? [...path, input] : path);
        }
        if (property === 'setData') {
          return (input: unknown, updater: unknown, options?: { updatedAt?: number }) => {
            queryClient.setQueryData(input ? [...path, input] : path, updater as any, options);
          };
        }
        if (property === 'fetch') {
          return async (
            input?: unknown,
            options?: Omit<FetchQueryOptions<unknown, HonoQueryError, unknown, QueryKey>, 'queryKey' | 'queryFn'>,
          ) => {
            const key = input ? [...path, input] : path;
            return queryClient.fetchQuery({
              ...(options as any),
              queryKey: key,
              queryFn: async () => {
                const endpoint = path.reduce((acc, p) => (acc as any)[p], client as any);
                const res = await endpoint.$get(input as any);
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({ message: res.statusText }));
                  throw new HonoQueryError(res, errorData);
                }
                return res.json();
              },
            });
          };
        }
        if (property.startsWith('$') || typeof property === 'symbol') {
          return undefined;
        }
        return createUtilsProxy<TApp>(queryClient, client, [...path, property]);
      },
    },
  );
};
