# Advanced Type-Safety Patterns

While `hono-query-client` provides powerful generic types out of the box, you can significantly improve your developer experience by creating a set of "bound" types specific to your application.

This allows you to define your Hono `AppType` only once and reuse it everywhere, avoiding repetitive generic arguments.

## The Problem: Repetitive Types

Using the convenience types directly can be verbose:

```typescript
import { ClientQueryOutput, ClientMutationInput } from '@scanpaigns/hono-query';
import type { AppType } from './server'; // Your Hono app type

// You have to pass AppType every time
type User = ClientQueryOutput<AppType, 'users', ':id'>;
type NewPost = ClientMutationInput<AppType, 'posts'>;
```

## The Solution: Create a Centralized Type Helper

Create a file, for example `src/lib/api-types.ts`, to define your application-specific types.

**`src/lib/api-types.ts`**
```typescript
import type { AppType } from '../../server'; // Adjust path to your AppType
import type { 
  HonoClient,
  ClientQueryOutput,
  ClientQueryInput,
  ClientMutationOutput,
  ClientMutationInput,
} from '@scanpaigns/hono-query';

// 1. Define your client type once
type AppClient = HonoClient<AppType>;

// 2. Create bound type aliases that use your client
export type QueryOutput<
  T extends keyof AppClient,
  U extends keyof AppClient[T] = never,
  V extends keyof AppClient[T][U] = never
> = ClientQueryOutput<AppType, T, U, V>;

export type QueryInput<
  T extends keyof AppClient,
  U extends keyof AppClient[T] = never,
  V extends keyof AppClient[T][U] = never
> = ClientQueryInput<AppType, T, U, V>;

export type MutationOutput<
  T extends keyof AppClient,
  U extends keyof AppClient[T] = never,
  V extends keyof AppClient[T][U] = never
> = ClientMutationOutput<AppType, T, U, V>;

export type MutationInput<
  T extends keyof AppClient,
  U extends keyof AppClient[T] = never,
  V extends keyof AppClient[T][U] = never
> = ClientMutationInput<AppType, T, U, V>;
```

## Improved Ergonomics

Now, you can import these simplified types throughout your application without ever needing to import `AppType` again.

**`src/components/UserProfile.tsx`**
```typescript
import { QueryOutput, MutationInput } from '../lib/api-types';

// No more <AppType, ...> needed!
type User = QueryOutput<'users', ':id'>;
type UpdateUserPayload = MutationInput<'users', ':id'>;

function UserProfile({ userId }: { userId: string }) {
  // ...
}
```

This pattern gives you the best of both worlds:
- **Maximum Type Safety**: Your routes are still strictly typed.
- **Great Developer Experience**: No repetitive generics.
- **Centralized Logic**: Your API's type "source of truth" is in one file. 