# API Reference

## Core Functions

### `createHonoQueryProxy<TApp>(client, path?)`

Creates a proxy object that automatically generates React Query hooks for your Hono API endpoints.

**Parameters:**
- `client: ReturnType<typeof hc<TApp>>` - The Hono client created with `hc()`
- `path?: string[]` - Internal parameter for nested paths (typically not used directly)

**Returns:** `RecursiveProxy<T, []>` - A proxy object with generated hooks

**Example:**
```tsx
import { hc } from 'hono/client';
import { createHonoQueryProxy } from '@scanpaigns/hono-query';
import type { AppType } from './server';

const honoClient = hc<AppType>('http://localhost:3000');
const api = createHonoQueryProxy(honoClient);
```

### `HonoQueryProvider`

React context provider that makes the query client available to all child components.

**Props:**
```tsx
type HonoQueryProviderProps = {
  children: ReactNode;
  queryClient: QueryClient;
}
```

**Example:**
```tsx
import { QueryClient } from '@tanstack/react-query';
import { HonoQueryProvider } from '@scanpaigns/hono-query';

const queryClient = new QueryClient();

function App() {
  return (
    <HonoQueryProvider queryClient={queryClient}>
      <YourApp />
    </HonoQueryProvider>
  );
}
```

### `useHonoQueryContext<TApp>()`

Hook to access the query client and utility functions within components.

**Returns:**
```tsx
type HonoQueryContextType<TApp> = {
  queryClient: QueryClient;
  utils: UtilsProxy<Client<TApp>>;
}
```

**Example:**
```tsx
import { useHonoQueryContext } from '@scanpaigns/hono-query';

function MyComponent() {
  const { queryClient, utils } = useHonoQueryContext();
  
  const handleInvalidate = () => {
    utils.users.invalidate(); // Invalidate all user queries
  };
}
```

## Generated Hooks

The proxy automatically generates the following hooks for each endpoint:

### Query Hooks

#### `useQuery(input?, options?)`

Generated for endpoints that support GET requests.

**Parameters:**
- `input?: QueryInput<T>` - Request parameters (path params, query params, headers)
- `options?: UseQueryOptions` - Standard React Query options (excluding `queryKey` and `queryFn`)

**Returns:** `UseQueryResult<TData, HonoQueryError>`

**Examples:**
```tsx
// Basic query - GET /users
const { data: users } = api.users.useQuery();

// Query with path parameters - GET /users/:id
const { data: user } = api.users[':id'].useQuery({ 
  param: { id: '123' } 
});

// Query with query parameters - GET /posts?page=1&limit=10
const { data: posts } = api.posts.useQuery({ 
  query: { page: 1, limit: 10 } 
});

// Query with headers
const { data: profile } = api.profile.useQuery(
  { header: { 'x-user-id': userId } },
  { enabled: !!userId }
);
```

#### `useInfiniteQuery(input, options)`

Generated for endpoints that support paginated GET requests.

**Parameters:**
- `input: InfiniteQueryInput<T>` - Request parameters (excluding page parameter)
- `options: UseInfiniteQueryOptions` - React Query infinite options (excluding `queryKey` and `queryFn`)

**Returns:** `UseInfiniteQueryResult<InfiniteData<TPage>, HonoQueryError>`

**Example:**
```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
} = api.posts.useInfiniteQuery(
  { query: { limit: 10 } },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
  }
);

// Access all pages
const allPosts = data?.pages.flatMap(page => page.items) ?? [];
```

### Mutation Hooks

Method-specific mutation hooks are generated for endpoints that support the corresponding HTTP methods.

#### `post.useMutation(options?)`

Generated for endpoints that support POST requests.

**Parameters:**
- `options?: UseMutationOptions` - Standard React Query mutation options (excluding `mutationFn`)

**Returns:** `UseMutationResult<TData, HonoQueryError, TVariables, TContext>`

**Example:**
```tsx
const createUser = api.users.post.useMutation({
  onSuccess: (data) => {
    console.log('User created:', data);
  },
  onError: (error) => {
    console.error('Failed to create user:', error.message);
  },
});

// Trigger the mutation
createUser.mutate({ 
  json: { name: 'John Doe', email: 'john@example.com' } 
});
```

#### `put.useMutation(options?)`

Generated for endpoints that support PUT requests.

**Example:**
```tsx
const replaceUser = api.users[':id'].put.useMutation();

replaceUser.mutate({
  param: { id: '123' },
  json: { name: 'Jane Doe', email: 'jane@example.com' }
});
```

#### `patch.useMutation(options?)`

Generated for endpoints that support PATCH requests.

**Example:**
```tsx
const updateUser = api.users[':id'].patch.useMutation({
  onSuccess: () => {
    // Cache automatically invalidated
    toast.success('User updated!');
  }
});

updateUser.mutate({
  param: { id: '123' },
  json: { name: 'Updated Name' }
});
```

#### `delete.useMutation(options?)`

Generated for endpoints that support DELETE requests.

**Example:**
```tsx
const deleteUser = api.users[':id'].delete.useMutation({
  onMutate: async (variables) => {
    // Optimistic update
    await queryClient.cancelQueries(['users']);
    const previousUsers = queryClient.getQueryData(['users']);
    
    queryClient.setQueryData(['users'], (old: any[]) =>
      old.filter(user => user.id !== variables.param.id)
    );
    
    return { previousUsers };
  },
  onError: (err, variables, context) => {
    // Rollback
    queryClient.setQueryData(['users'], context?.previousUsers);
  },
});

deleteUser.mutate({ param: { id: '123' } });
```

## Type Definitions

### Core Types

#### `HonoQueryError`

Custom error class for failed requests.

```tsx
class HonoQueryError extends Error {
  response: Response;
  data: any;
  
  constructor(res: Response, data: any);
}
```

**Properties:**
- `response: Response` - The original fetch Response object
- `data: any` - Parsed error data from the response body
- `message: string` - Error message (inherited from Error)

**Example:**
```tsx
const mutation = api.users.post.useMutation({
  onError: (error) => {
    if (error instanceof HonoQueryError) {
      console.log('HTTP Status:', error.response.status);
      console.log('Error details:', error.data);
      
      if (error.response.status === 400) {
        // Handle validation errors
        console.log('Validation errors:', error.data.errors);
      }
    }
  }
});
```

### Type Inference Helpers

#### `ApiOutputs<TApp>`

Extracts all GET response types from your Hono app.

```tsx
import type { AppType } from './server';

type AllGetResponses = ApiOutputs<AppType>;
type UserResponse = ApiOutputs<AppType>['users'][':id'];
type PostsListResponse = ApiOutputs<AppType>['posts'];
```

#### `ApiInputs<TApp>`

Extracts all GET request input types from your Hono app.

```tsx
type AllGetInputs = ApiInputs<AppType>;
type UserQueryInput = ApiInputs<AppType>['users'][':id'];
type PostsQueryInput = ApiInputs<AppType>['posts'];
```

#### `ApiMutationOutputs<TApp>`

Extracts all mutation response types (POST, PUT, PATCH, DELETE) from your Hono app.

```tsx
type AllMutationResponses = ApiMutationOutputs<AppType>;
type CreateUserResponse = ApiMutationOutputs<AppType>['users'];
type UpdateUserResponse = ApiMutationOutputs<AppType>['users'][':id'];
```

#### `ApiMutationInputs<TApp>`

Extracts all mutation input types from your Hono app.

```tsx
type AllMutationInputs = ApiMutationInputs<AppType>;
type CreateUserInput = ApiMutationInputs<AppType>['users'];
type UpdateUserInput = ApiMutationInputs<AppType>['users'][':id'];
```

#### `ApiEndpointTypes<TApp>`

Comprehensive type that extracts both query and mutation types for all endpoints.

```tsx
type EndpointTypes = ApiEndpointTypes<AppType>;

// Access specific endpoint types
type UserEndpoint = EndpointTypes['users'][':id'];
// UserEndpoint has:
// - QueryInput: GET request input type
// - QueryOutput: GET response type  
// - MutationInput: POST/PUT/PATCH/DELETE input type
// - MutationOutput: POST/PUT/PATCH/DELETE response type
```

## Advanced Features

### Cache Utilities

The `utils` object provides cache management functions:

```tsx
const { utils } = useHonoQueryContext();

// Invalidate specific queries
utils.users.invalidate();              // All user queries
utils.users[':id'].invalidate();       // Specific user query
utils.posts.comments.invalidate();     // Nested endpoint queries

// The invalidation pattern matches the API structure
utils.api.v1.users.invalidate();       // /api/v1/users
utils['content-schedule'].items.invalidate(); // /content-schedule/items
```

### Automatic Cache Invalidation

The library automatically invalidates relevant cache entries after mutations:

1. **Collection mutations** (e.g., `POST /users`):
   - Invalidates the collection cache (`/users`)

2. **Resource mutations** (e.g., `PATCH /users/:id`):
   - Invalidates the specific resource cache (`/users/:id`)
   - Invalidates the collection cache (`/users`)

3. **Nested resource mutations** (e.g., `DELETE /users/:id/posts/:postId`):
   - Invalidates the specific nested resource (`/users/:id/posts/:postId`)
   - Invalidates the nested collection (`/users/:id/posts`)
   - Invalidates the parent resource (`/users/:id`)

### Path Parameter Handling

The library automatically handles Hono's path parameter syntax:

```tsx
// Hono route: /users/:id/posts/:postId
const { data: post } = api.users[':id'].posts[':postId'].useQuery({
  param: { id: 'user123', postId: 'post456' }
});

// Hono route with multiple segments: /api/v1/users/:userId
const { data: user } = api.api.v1.users[':userId'].useQuery({
  param: { userId: '123' }
});
```

### Complex Query Parameters

Handle complex query parameters and headers:

```tsx
// Complex query with multiple parameters
const { data: posts } = api.posts.useQuery({
  query: {
    page: 1,
    limit: 20,
    sort: 'created_at',
    order: 'desc',
    tags: ['react', 'typescript'],
    author: 'john-doe'
  }
});

// Request with custom headers
const { data: profile } = api.profile.useQuery({
  header: {
    'x-user-preferences': 'detailed',
    'x-include-settings': 'true'
  }
});

// Combined parameters
const { data: userPosts } = api.users[':id'].posts.useQuery({
  param: { id: 'user123' },
  query: { limit: 10, status: 'published' },
  header: { 'x-include-drafts': 'false' }
});
```

### Error Handling Patterns

```tsx
// Global error handling
const api = createHonoQueryProxy(honoClient);

// Component-level error handling
function UserList() {
  const { data: users, error, isError } = api.users.useQuery();
  
  if (isError) {
    if (error instanceof HonoQueryError) {
      switch (error.response.status) {
        case 401:
          return <div>Please log in to view users</div>;
        case 403:
          return <div>You don't have permission to view users</div>;
        case 500:
          return <div>Server error. Please try again later.</div>;
        default:
          return <div>Error: {error.message}</div>;
      }
    }
    return <div>An unexpected error occurred</div>;
  }
  
  return <UserListComponent users={users} />;
}
``` 