import type { hc } from "hono/client";
import type { Hono } from "hono";

export type HonoClient<TApp extends Hono<any, any, any>> = ReturnType<typeof hc<TApp>>;

export type CacheUtils<TPath extends string[]> = {
  invalidate: () => void;
};

export type UtilsProxy<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? never
    : UtilsProxy<T[P]> & CacheUtils<[P & string]>;
};