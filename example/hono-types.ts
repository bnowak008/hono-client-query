import { hc, type InferResponseType, type InferRequestType } from 'hono/client';
import type { AppType } from './server';

// Raw hono client type for direct access
type RawClient = ReturnType<typeof hc<AppType>>;

export type GetQueryOutput<
  T extends keyof RawClient['api'],
  U extends keyof RawClient['api'][T] = never,
  V extends keyof RawClient['api'][T][U] = never
> = [V] extends [never]
  ? [U] extends [never]
    ? RawClient['api'][T] extends { $get: any }
      ? InferResponseType<RawClient['api'][T]['$get']>
      : never
    : RawClient['api'][T][U] extends { $get: any }
    ? InferResponseType<RawClient['api'][T][U]['$get']>
    : never
  : RawClient['api'][T][U][V] extends { $get: any }
  ? InferResponseType<RawClient['api'][T][U][V]['$get']>
  : never;

export type GetQueryInput<
  T extends keyof RawClient['api'],
  U extends keyof RawClient['api'][T] = never,
  V extends keyof RawClient['api'][T][U] = never
> = [V] extends [never]
  ? [U] extends [never]
    ? RawClient['api'][T] extends { $get: any }
      ? InferRequestType<RawClient['api'][T]['$get']>
      : never
    : RawClient['api'][T][U] extends { $get: any }
    ? InferRequestType<RawClient['api'][T][U]['$get']>
    : never
  : RawClient['api'][T][U][V] extends { $get: any }
  ? InferRequestType<RawClient['api'][T][U][V]['$get']>
  : never;

export type GetMutationOutput<
  T extends keyof RawClient['api'],
  U extends keyof RawClient['api'][T] = never,
  V extends keyof RawClient['api'][T][U] = never
> = [V] extends [never]
  ? [U] extends [never]
    ? RawClient['api'][T] extends { $post: any }
      ? InferResponseType<RawClient['api'][T]['$post']>
      : RawClient['api'][T] extends { $patch: any }
      ? InferResponseType<RawClient['api'][T]['$patch']>
      : RawClient['api'][T] extends { $put: any }
      ? InferResponseType<RawClient['api'][T]['$put']>
      : RawClient['api'][T] extends { $delete: any }
      ? InferResponseType<RawClient['api'][T]['$delete']>
      : never
    : RawClient['api'][T][U] extends { $post: any }
    ? InferResponseType<RawClient['api'][T][U]['$post']>
    : RawClient['api'][T][U] extends { $patch: any }
    ? InferResponseType<RawClient['api'][T][U]['$patch']>
    : RawClient['api'][T][U] extends { $put: any }
    ? InferResponseType<RawClient['api'][T][U]['$put']>
    : RawClient['api'][T][U] extends { $delete: any }
    ? InferResponseType<RawClient['api'][T][U]['$delete']>
    : never
  : RawClient['api'][T][U][V] extends { $post: any }
  ? InferResponseType<RawClient['api'][T][U][V]['$post']>
  : RawClient['api'][T][U][V] extends { $patch: any }
  ? InferResponseType<RawClient['api'][T][U][V]['$patch']>
  : RawClient['api'][T][U][V] extends { $put: any }
  ? InferResponseType<RawClient['api'][T][U][V]['$put']>
  : RawClient['api'][T][U][V] extends { $delete: any }
  ? InferResponseType<RawClient['api'][T][U][V]['$delete']>
  : never;

export type GetMutationInput<
  T extends keyof RawClient['api'],
  U extends keyof RawClient['api'][T] = never,
  V extends keyof RawClient['api'][T][U] = never
> = [V] extends [never]
  ? [U] extends [never]
    ? RawClient['api'][T] extends { $post: any }
      ? InferRequestType<RawClient['api'][T]['$post']>
      : RawClient['api'][T] extends { $patch: any }
      ? InferRequestType<RawClient['api'][T]['$patch']>
      : RawClient['api'][T] extends { $put: any }
      ? InferRequestType<RawClient['api'][T]['$put']>
      : RawClient['api'][T] extends { $delete: any }
      ? InferRequestType<RawClient['api'][T]['$delete']>
      : never
    : RawClient['api'][T][U] extends { $post: any }
    ? InferRequestType<RawClient['api'][T][U]['$post']>
    : RawClient['api'][T][U] extends { $patch: any }
    ? InferRequestType<RawClient['api'][T][U]['$patch']>
    : RawClient['api'][T][U] extends { $put: any }
    ? InferRequestType<RawClient['api'][T][U]['$put']>
    : RawClient['api'][T][U] extends { $delete: any }
    ? InferRequestType<RawClient['api'][T][U]['$delete']>
    : never
  : RawClient['api'][T][U][V] extends { $post: any }
  ? InferRequestType<RawClient['api'][T][U][V]['$post']>
  : RawClient['api'][T][U][V] extends { $patch: any }
  ? InferRequestType<RawClient['api'][T][U][V]['$patch']>
  : RawClient['api'][T][U][V] extends { $put: any }
  ? InferRequestType<RawClient['api'][T][U][V]['$put']>
  : RawClient['api'][T][U][V] extends { $delete: any }
  ? InferRequestType<RawClient['api'][T][U][V]['$delete']>
  : never; 