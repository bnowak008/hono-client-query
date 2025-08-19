import type { hc, InferRequestType, InferResponseType } from "hono/client";
import type { Hono } from "hono";
import type { FetchQueryOptions, InfiniteData, QueryKey, UseInfiniteQueryOptions, UseInfiniteQueryResult, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { HonoQueryError } from "./error";

export type Client<TApp extends Hono<any, any, any>> = ReturnType<typeof hc<TApp>>;

export type HasEndpoint<T> = T extends { $get: any } | { $post: any } | { $put: any } | { $patch: any } | { $delete: any } ? true : false;

export type MethodMutationHook<T, TMethod extends string> = {
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

export type MethodHooks<T> = 
  (T extends { $post: any } ? { post: MethodMutationHook<T, 'post'> } : {}) &
  (T extends { $put: any } ? { put: MethodMutationHook<T, 'put'> } : {}) &
  (T extends { $patch: any } ? { patch: MethodMutationHook<T, 'patch'> } : {}) &
  (T extends { $delete: any } ? { delete: MethodMutationHook<T, 'delete'> } : {});

// Filter out raw Hono methods (properties starting with $)
export type FilteredKeys<T> = {
  [K in keyof T]: K extends `$${string}`
    ? never
    : K extends '*'
      ? never
      : K;
}[keyof T];

export type FilteredClient<T> = Pick<T, FilteredKeys<T>>;

export type RecursiveProxy<T, TPath extends string[]> = {
  [P in keyof FilteredClient<T>]: T[P] extends (...args: any[]) => any
    ? never
    : (HasEndpoint<T[P]> extends true
        ? HookWrapper<T[P], [...TPath, P & string]> & MethodHooks<T[P]>
        : unknown) &
        RecursiveProxy<T[P], [...TPath, P & string]>;
};

export type HookWrapper<T, TPath extends string[]> = {
  useQuery: <TData = ExtractQueryOutput<T>>(
    input?: ExtractQueryInput<T>,
    options?: Omit<
      UseQueryOptions<ExtractQueryOutput<T>, HonoQueryError, TData>,
      'queryKey' | 'queryFn'
    >,
  ) => UseQueryResult<TData, HonoQueryError>;
  useInfiniteQuery: <TPage = ExtractQueryOutput<T>>(
    input: Omit<ExtractQueryInput<T>, 'query'> & {
      query?: Omit<Extract<ExtractQueryInput<T>, { query: any }>['query'], 'page'>;
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

type ExtractQueryInput<T> = InferRequestType<Extract<T, { $get: any }>['$get']>;
type ExtractQueryOutput<T> = InferResponseType<Extract<T, { $get: any }>['$get']>;

export type AnyMutation<T> =
  | Extract<T, { $post: any }>['$post']
  | Extract<T, { $put: any }>['$put']
  | Extract<T, { $patch: any }>['$patch']
  | Extract<T, { $delete: any }>['$delete'];

type ExtractMutationInput<T> = InferRequestType<AnyMutation<T>>;
type ExtractMutationOutput<T> = InferResponseType<AnyMutation<T>>;

export type CacheUtils<
  TPath extends string[],
  TApp extends Hono<any, any, any>,
  TEndpoint,
> = {
  invalidate: (
    input?: TEndpoint extends { $get: any } ? InferRequestType<TEndpoint['$get']> : never,
  ) => void;
  getData: (
    input?: TEndpoint extends { $get: any }
      ? InferRequestType<TEndpoint['$get']>
      : never,
  ) => TEndpoint extends { $get: any }
    ? InferResponseType<TEndpoint['$get']> | undefined
    : never;
  setData: (
    input: TEndpoint extends { $get: any }
      ? InferRequestType<TEndpoint['$get']>
      : never,
    updater: TEndpoint extends { $get: any }
      ? InferResponseType<TEndpoint['$get']> | ((old: InferResponseType<TEndpoint['$get']> | undefined) => InferResponseType<TEndpoint['$get']>)
      : never,
    options?: { updatedAt?: number },
  ) => void;
  fetch: (
    input?: TEndpoint extends { $get: any }
      ? InferRequestType<TEndpoint['$get']>
      : never,
    options?: Omit<
      FetchQueryOptions<
        TEndpoint extends { $get: any } ? InferResponseType<TEndpoint['$get']> : unknown,
        HonoQueryError,
        TEndpoint extends { $get: any } ? InferResponseType<TEndpoint['$get']> : unknown,
        QueryKey
      >,
      'queryKey' | 'queryFn'
    >,
  ) => Promise<
    TEndpoint extends { $get: any }
      ? InferResponseType<TEndpoint['$get']>
      : never
  >;
};

export type UtilsProxy<T, TApp extends Hono<any, any, any>> = {
  [P in keyof FilteredClient<T>]: UtilsProxy<T[P], TApp> &
    CacheUtils<[P & string], TApp, T[P]>;
};

// Updated types to allow root-level access
export type QueryOutput<TClient, T extends keyof TClient = never, U extends keyof TClient[T] = never, V extends keyof TClient[T][U] = never> = [T] extends [never]
  ? TClient extends { $get: any }
    ? InferResponseType<TClient['$get']>
    : never
  : [V] extends [never]
  ? [U] extends [never]
    ? TClient[T] extends { $get: any }
      ? InferResponseType<TClient[T]['$get']>
      : never
    : TClient[T][U] extends { $get: any }
    ? InferResponseType<TClient[T][U]['$get']>
    : never
  : TClient[T][U][V] extends { $get: any }
  ? InferResponseType<TClient[T][U][V]['$get']>
  : never;

export type QueryInput<TClient, T extends keyof TClient = never, U extends keyof TClient[T] = never, V extends keyof TClient[T][U] = never> = [T] extends [never]
  ? TClient extends { $get: any }
    ? InferRequestType<TClient['$get']>
    : never
  : [V] extends [never]
  ? [U] extends [never]
    ? TClient[T] extends { $get: any }
      ? InferRequestType<TClient[T]['$get']>
      : never
    : TClient[T][U] extends { $get: any }
    ? InferRequestType<TClient[T][U]['$get']>
    : never
  : TClient[T][U][V] extends { $get: any }
  ? InferRequestType<TClient[T][U][V]['$get']>
  : never;

export type MutationOutput<TClient, T extends keyof TClient = never, U extends keyof TClient[T] = never, V extends keyof TClient[T][U] = never> = [T] extends [never]
  ? TClient extends { $post: any }
    ? InferResponseType<TClient['$post']>
    : TClient extends { $patch: any }
    ? InferResponseType<TClient['$patch']>
    : TClient extends { $put: any }
    ? InferResponseType<TClient['$put']>
    : TClient extends { $delete: any }
    ? InferResponseType<TClient['$delete']>
    : never
  : [V] extends [never]
  ? [U] extends [never]
    ? TClient[T] extends { $post: any }
      ? InferResponseType<TClient[T]['$post']>
      : TClient[T] extends { $patch: any }
      ? InferResponseType<TClient[T]['$patch']>
      : TClient[T] extends { $put: any }
      ? InferResponseType<TClient[T]['$put']>
      : TClient[T] extends { $delete: any }
      ? InferResponseType<TClient[T]['$delete']>
      : never
    : TClient[T][U] extends { $post: any }
    ? InferResponseType<TClient[T][U]['$post']>
    : TClient[T][U] extends { $patch: any }
    ? InferResponseType<TClient[T][U]['$patch']>
    : TClient[T][U] extends { $put: any }
    ? InferResponseType<TClient[T][U]['$put']>
    : TClient[T][U] extends { $delete: any }
    ? InferResponseType<TClient[T][U]['$delete']>
    : never
  : TClient[T][U][V] extends { $post: any }
  ? InferResponseType<TClient[T][U][V]['$post']>
  : TClient[T][U][V] extends { $patch: any }
  ? InferResponseType<TClient[T][U][V]['$patch']>
  : TClient[T][U][V] extends { $put: any }
  ? InferResponseType<TClient[T][U][V]['$put']>
  : TClient[T][U][V] extends { $delete: any }
  ? InferResponseType<TClient[T][U][V]['$delete']>
  : never;

export type MutationInput<TClient, T extends keyof TClient = never, U extends keyof TClient[T] = never, V extends keyof TClient[T][U] = never> = [T] extends [never]
  ? TClient extends { $post: any }
    ? InferRequestType<TClient['$post']>
    : TClient extends { $patch: any }
    ? InferRequestType<TClient['$patch']>
    : TClient extends { $put: any }
    ? InferRequestType<TClient['$put']>
    : TClient extends { $delete: any }
    ? InferRequestType<TClient['$delete']>
    : never
  : [V] extends [never]
  ? [U] extends [never]
    ? TClient[T] extends { $post: any }
      ? InferRequestType<TClient[T]['$post']>
      : TClient[T] extends { $patch: any }
      ? InferRequestType<TClient[T]['$patch']>
      : TClient[T] extends { $put: any }
      ? InferRequestType<TClient[T]['$put']>
      : TClient[T] extends { $delete: any }
      ? InferRequestType<TClient[T]['$delete']>
      : never
    : TClient[T][U] extends { $post: any }
    ? InferRequestType<TClient[T][U]['$post']>
    : TClient[T][U] extends { $patch: any }
    ? InferRequestType<TClient[T][U]['$patch']>
    : TClient[T][U] extends { $put: any }
    ? InferRequestType<TClient[T][U]['$put']>
    : TClient[T][U] extends { $delete: any }
    ? InferRequestType<TClient[T][U]['$delete']>
    : never
  : TClient[T][U][V] extends { $post: any }
  ? InferRequestType<TClient[T][U][V]['$post']>
  : TClient[T][U][V] extends { $patch: any }
  ? InferRequestType<TClient[T][U][V]['$patch']>
  : TClient[T][U][V] extends { $put: any }
  ? InferRequestType<TClient[T][U][V]['$put']>
  : TClient[T][U][V] extends { $delete: any }
  ? InferRequestType<TClient[T][U][V]['$delete']>
  : never;
