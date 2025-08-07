import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import { hc, type InferResponseType, type InferRequestType } from 'hono/client';
import type { Hono } from 'hono';
import { useHonoQueryContext } from './Context';

//===============//
// Error Handling //
//===============//

export class HonoQueryError extends Error {
  response: Response;
  data: any;

  constructor(res: Response, data: any) {
    super(data?.message || res.statusText);
    this.name = 'HonoQueryError';
    this.response = res;
    this.data = data;
  }
}

//===============//
//     Types     //
//===============//

type HasEndpoint<T> = T extends { $get: any } | { $post: any } | { $put: any } | { $patch: any } | { $delete: any } ? true : false;

type MethodMutationHook<T, TMethod extends string> = {
  useMutation: <
    TData = InferResponseType<Extract<T, Record<`$${TMethod}`, any>>[`$${TMethod}`]>,
    TVariables = InferRequestType<Extract<T, Record<`$${TMethod}`, any>>[`$${TMethod}`]>,
    TContext = unknown,
  >(
    options?: Omit<
      UseMutationOptions<TData, HonoQueryError, TVariables, TContext>,
      'mutationFn'
    >,
  ) => UseMutationResult<TData, HonoQueryError, TVariables, TContext>;
};

type MethodHooks<T> = 
  (T extends { $post: any } ? { post: MethodMutationHook<T, 'post'> } : {}) &
  (T extends { $put: any } ? { put: MethodMutationHook<T, 'put'> } : {}) &
  (T extends { $patch: any } ? { patch: MethodMutationHook<T, 'patch'> } : {}) &
  (T extends { $delete: any } ? { delete: MethodMutationHook<T, 'delete'> } : {});

// Filter out raw Hono methods (properties starting with $)
type FilteredKeys<T> = {
  [K in keyof T]: K extends `$${string}` ? never : K;
}[keyof T];

type FilteredClient<T> = Pick<T, FilteredKeys<T>>;

type RecursiveProxy<T, TPath extends string[]> = {
  [P in keyof FilteredClient<T>]: T[P] extends (...args: any[]) => any
    ? never
    : (HasEndpoint<T[P]> extends true
        ? HookWrapper<T[P], [...TPath, P & string]> & MethodHooks<T[P]>
        : unknown) &
        RecursiveProxy<T[P], [...TPath, P & string]>;
};

type HookWrapper<T, TPath extends string[]> = {
  useQuery: <TData = QueryOutput<T>>(
    input?: QueryInput<T>,
    options?: Omit<
      UseQueryOptions<QueryOutput<T>, HonoQueryError, TData>,
      'queryKey' | 'queryFn'
    >,
  ) => UseQueryResult<TData, HonoQueryError>;
  useInfiniteQuery: <TPage = QueryOutput<T>>(
    input: Omit<QueryInput<T>, 'query'> & {
      query?: Omit<Extract<QueryInput<T>, { query: any }>['query'], 'page'>;
    },
    options: Omit<
      UseInfiniteQueryOptions<
        TPage,
        HonoQueryError,
        InfiniteData<TPage>,
        QueryKey,
        any
      >,
      'queryKey' | 'queryFn'
    >,
  ) => UseInfiniteQueryResult<InfiniteData<TPage>, HonoQueryError>;
};

type QueryInput<T> = InferRequestType<Extract<T, { $get: any }>['$get']>;
type QueryOutput<T> = InferResponseType<Extract<T, { $get: any }>['$get']>;

type AnyMutation<T> =
  | Extract<T, { $post: any }>['$post']
  | Extract<T, { $put: any }>['$put']
  | Extract<T, { $patch: any }>['$patch']
  | Extract<T, { $delete: any }>['$delete'];

type MutationInput<T> = InferRequestType<AnyMutation<T>>;
type MutationOutput<T> = InferResponseType<AnyMutation<T>>;

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

const createMethodMutation = (client: any, path: string[], method: string) => {
  return (options: UseMutationOptions<any, any, any, any> = {}) => {
    const { queryClient } = useHonoQueryContext();
    const { onSuccess, ...restOptions } = options;

    return useMutation({
      ...restOptions,
      mutationFn: async (variables: unknown) => {
        const rpc = path.reduce((acc, p) => acc[p], client as any);
        const honoMethod = `$${method.toLowerCase()}`;
        
        if (!(honoMethod in rpc)) {
          throw new Error(
            `Method ${method} not found for endpoint: ${path.join('.')}`,
          );
        }

        const res = await rpc[honoMethod](variables as any);

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: res.statusText }));
          throw new HonoQueryError(res, errorData);
        }
        return res.json();
      },
      onSuccess: (data, variables, context) => {
        const lastSegment = path.length > 0 ? path[path.length - 1] : '';
        const isResourceMutation = lastSegment?.startsWith(':');

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

const proxyHandlers = <T extends object>(client: T, path: string[]) => ({
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
      
      // Only create method hook if the endpoint supports this method
      if (honoMethod in rpc) {
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

export const createHonoQueryProxy = <T extends object>(
  client: T,
  path: string[] = [],
): RecursiveProxy<T, []> => {
  return new Proxy({}, proxyHandlers(client, path)) as RecursiveProxy<
    T,
    []
  >;
};

//===============//
// Context & Utils //
//===============//

type UtilsProxy<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? never
    : UtilsProxy<T[P]> & CacheUtils<[P & string]>;
};

type CacheUtils<TPath extends string[]> = {
  invalidate: () => void;
};

export const createUtilsProxy = <T,>(
  queryClient: QueryClient,
  path: string[] = [],
): UtilsProxy<T> => {
  return new Proxy(
    {},
    {
      get: (_target, property: string) => {
        if (property === 'invalidate') {
          return () => queryClient.invalidateQueries({ queryKey: path });
        }
        return createUtilsProxy(queryClient, [...path, property]);
      },
    },
  ) as UtilsProxy<T>;
};


//===============//
// Type Inference //
//===============//

// Helper to extract GET response types
type InferGetResponse<T> = T extends { $get: infer Get }
  ? Get extends (...args: any[]) => any
    ? InferResponseType<Get>
    : never
  : never;

// Helper to extract GET request types
type InferGetInput<T> = T extends { $get: infer Get }
  ? Get extends (...args: any[]) => any
    ? InferRequestType<Get>
    : never
  : never;

// Helper to extract mutation response types (POST, PUT, PATCH, DELETE)
type InferMutationResponse<T> = T extends { $post: infer Post }
  ? Post extends (...args: any[]) => any
    ? InferResponseType<Post>
    : never
  : T extends { $put: infer Put }
  ? Put extends (...args: any[]) => any
    ? InferResponseType<Put>
    : never
  : T extends { $patch: infer Patch }
  ? Patch extends (...args: any[]) => any
    ? InferResponseType<Patch>
    : never
  : T extends { $delete: infer Delete }
  ? Delete extends (...args: any[]) => any
    ? InferResponseType<Delete>
    : never
  : never;

// Helper to extract mutation request types (POST, PUT, PATCH, DELETE)
type InferMutationInput<T> = T extends { $post: infer Post }
  ? Post extends (...args: any[]) => any
    ? InferRequestType<Post>
    : never
  : T extends { $put: infer Put }
  ? Put extends (...args: any[]) => any
    ? InferRequestType<Put>
    : never
  : T extends { $patch: infer Patch }
  ? Patch extends (...args: any[]) => any
    ? InferRequestType<Patch>
    : never
  : T extends { $delete: infer Delete }
  ? Delete extends (...args: any[]) => any
    ? InferRequestType<Delete>
    : never
  : never;

// Deep type mappers that preserve the nested structure
type DeepEndpointOutputs<T> = {
  [K in keyof T]: T[K] extends { $get: any } | { $post: any } | { $put: any } | { $patch: any } | { $delete: any }
    ? {
        QueryInput: T[K] extends { $get: any } ? InferGetInput<T[K]> : never;
        QueryOutput: T[K] extends { $get: any } ? InferGetResponse<T[K]> : never;
        MutationInput: T[K] extends { $post: any } | { $put: any } | { $patch: any } | { $delete: any } ? InferMutationInput<T[K]> : never;
        MutationOutput: T[K] extends { $post: any } | { $put: any } | { $patch: any } | { $delete: any } ? InferMutationResponse<T[K]> : never;
      }
    : DeepEndpointOutputs<T[K]>;
};

// Original type helpers for backward compatibility
type DeepGetOutputs<T> = {
  [K in keyof T]: T[K] extends { $get: any }
    ? InferGetResponse<T[K]>
    : T[K] extends object
      ? DeepGetOutputs<T[K]>
      : never;
} & {};

export type ApiOutputs<TApp extends Hono<any, any, any>> = DeepGetOutputs<ReturnType<typeof hc<TApp>>>;

type DeepGetInputs<T> = {
  [K in keyof T]: T[K] extends { $get: any }
    ? InferGetInput<T[K]>
    : T[K] extends object
      ? DeepGetInputs<T[K]>
      : never;
} & {};

export type ApiInputs<TApp extends Hono<any, any, any>> = DeepGetInputs<ReturnType<typeof hc<TApp>>>;

type DeepMutationOutputs<T> = {
  [K in keyof T]: T[K] extends { $post: any } | { $put: any } | { $patch: any } | { $delete: any }
    ? InferMutationResponse<T[K]>
    : T[K] extends object
      ? DeepMutationOutputs<T[K]>
      : never;
} & {};

export type ApiMutationOutputs<TApp extends Hono<any, any, any>> = DeepMutationOutputs<ReturnType<typeof hc<TApp>>>;

type DeepMutationInputs<T> = {
  [K in keyof T]: T[K] extends { $post: any } | { $put: any } | { $patch: any } | { $delete: any }
    ? InferMutationInput<T[K]>
    : T[K] extends object
      ? DeepMutationInputs<T[K]>
      : never;
} & {};

export type ApiMutationInputs<TApp extends Hono<any, any, any>> = DeepMutationInputs<ReturnType<typeof hc<TApp>>>;

// Helper type to extract both query and mutation types from an endpoint
export type ApiEndpoint<TApp extends Hono<any, any, any>, T extends keyof ReturnType<typeof hc<TApp>>> = {
  query: {
    input: ApiInputs<TApp>[T];
    output: ApiOutputs<TApp>[T];
  };
  mutation: {
    input: ApiMutationInputs<TApp>[T];
    output: ApiMutationOutputs<TApp>[T];
  };
};

// New comprehensive endpoint types that preserve nested structure
export type ApiEndpointTypes<TApp extends Hono<any, any, any>> = DeepEndpointOutputs<ReturnType<typeof hc<TApp>>>;

// Helper type for accessing endpoint types directly
export type GetEndpointTypes<TClient, TPath extends string> = 
  TClient extends Record<string, any> 
    ? TPath extends keyof TClient
      ? TClient[TPath] extends { $get: any }
        ? {
            QueryInput: InferGetInput<TClient[TPath]>;
            QueryOutput: InferGetResponse<TClient[TPath]>;
            MutationInput: InferMutationInput<TClient[TPath]>;
            MutationOutput: InferMutationResponse<TClient[TPath]>;
          }
        : never
      : never
    : never; 