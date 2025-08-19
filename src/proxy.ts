import type { RecursiveProxy } from "./types";
import type { UseMutationOptions, UseQueryOptions, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { HonoQueryError } from "./error";
import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useHonoQueryContext } from "./Context";
import { hc } from "hono/client";
import type { Hono } from "hono";

//===============//
//  Proxy Core   //
//===============//

/**
 * Method-specific mutation hooks implementation
 * 
 * Usage examples:
 * - api['content-schedule'][':id'].patch.useMutation() // PATCH /content-schedule/:id
 * - api['content-schedule'][':id'].delete.useMutation() // DELETE /content-schedule/:id
 * - api['content-schedule'].post.useMutation() // POST /content-schedule
 * - api['content-schedule'].items[':id'].patch.useMutation() // PATCH /content-schedule/items/:id
 * - api['content-schedule'].items[':id'].delete.useMutation() // DELETE /content-schedule/items/:id
 * 
 * Only the methods that exist on each endpoint will be exposed in TypeScript.
 * The generic useMutation() has been removed - you must use method-specific mutations.
 */

export const createMethodMutation = (client: any, path: string[], method: string) => {
  return (options: UseMutationOptions<any, any, any, any> = {}) => {
    const { queryClient } = useHonoQueryContext();
    const { onSuccess, ...restOptions } = options;

    return useMutation({
      ...restOptions,
      mutationFn: async (variables: unknown) => {
        const rpc = path.reduce((acc, p) => acc[p], client as any);
        const honoMethod = `$${method.toLowerCase()}`;

        const methodFn = (rpc as any)[honoMethod];
        if (typeof methodFn !== 'function') {
          throw new Error(
            `Method ${method} not found for endpoint: ${path.join('.')}`,
          );
        }

        const res = await methodFn(variables as any);

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: res.statusText }));
          throw new HonoQueryError(res, errorData);
        }
        return res.json();
      },
      onSuccess: (data, variables, context) => {
        const lastSegment = path.at(-1) ?? '';
        const isResourceMutation = lastSegment.startsWith(':');

        // Always invalidate the collection path.
        // For /items/:id, this is /items.
        // For /items (e.g., a create mutation), this is /items.
        const collectionPath = isResourceMutation ? path.slice(0, -1) : path;
        queryClient.invalidateQueries({ queryKey: collectionPath });

        // If we're mutating a specific resource, invalidate that resource's query.
        if (isResourceMutation) {
          queryClient.invalidateQueries({ queryKey: path });
        }

        onSuccess?.(data, variables, context);
      },
    });
  };
};

const proxyHandlers = <TApp extends Hono<any, any, any>>(client: ReturnType<typeof hc<TApp>>, path: string[]) => ({
  get: (_target: unknown, property: string): unknown => {
    if (property === 'useQuery') {
      return (
        input: unknown,
        options?: Omit<
          UseQueryOptions<unknown, HonoQueryError, unknown>,
          'queryKey' | 'queryFn'
        >,
      ) => {
        return useQuery({
          ...options,
          queryKey: [...path, input],
          queryFn: async () => {
            const rpc = path.reduce((acc, p) => acc[p], client as any);
            const res = await rpc.$get(input as any);
            if (!res.ok) {
              const errorData = await res
                .json()
                .catch(() => ({ message: res.statusText }));
              throw new HonoQueryError(res, errorData);
            }
            return res.json();
          },
        });
      };
    }

    if (property === 'useInfiniteQuery') {
      return (
        input: unknown,
        options: Omit<
          UseInfiniteQueryOptions<unknown, HonoQueryError, unknown>,
          'queryKey' | 'queryFn'
        >,
      ) => {
        return useInfiniteQuery({
          ...options,
          queryKey: [...path, input],
          queryFn: async ({ pageParam }) => {
            const rpc = path.reduce((acc, p) => acc[p], client as any);
            const finalInput = {
              ...(input as any),
              query: {
                ...((input as any)?.query ?? {}),
                page: pageParam,
              },
            };
            const res = await rpc.$get(finalInput);
            if (!res.ok) {
              const errorData = await res
                .json()
                .catch(() => ({ message: res.statusText }));
              throw new HonoQueryError(res, errorData);
            }
            return res.json();
          },
        });
      };
    }



    // Handle method-specific mutation hooks
    if (['post', 'put', 'patch', 'delete'].includes(property)) {
      const rpc = path.reduce((acc, p) => acc[p], client as any);
      const honoMethod = `$${property}`;

      const methodFn = (rpc as any)[honoMethod];
      if (typeof methodFn === 'function') {
        return new Proxy({}, {
          get: (_target, hookProperty: string) => {
            if (hookProperty === 'useMutation') {
              return createMethodMutation(client, path, property);
            }
            return undefined;
          }
        });
      }
      return undefined;
    }

    // Block raw Hono methods from being exposed
    if (property.startsWith('$')) {
      return undefined;
    }

    return createHonoQueryProxy(client, [...path, property]);
  },
});

export const createHonoQueryProxy = <TApp extends Hono<any, any, any>>(
  client: ReturnType<typeof hc<TApp>>,
  path: string[] = [],
) => {
  const proxy = new Proxy({}, proxyHandlers(client, path)) as RecursiveProxy<
    TApp,
    []
  >;

  return proxy;
};
