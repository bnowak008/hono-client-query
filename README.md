# @scanpaigns/hono-query

A type-safe, React Query-powered client library for Hono applications. Automatically generates React hooks for your Hono API routes with full TypeScript support, intelligent cache management, and method-specific mutations.

## Features

- 🔥 **Type-Safe**: Full TypeScript support with automatic type inference from your Hono app
- ⚡ **Method-Specific Mutations**: Dedicated hooks for POST, PUT, PATCH, and DELETE operations
- 🔄 **Intelligent Cache Management**: Automatic cache invalidation based on endpoint patterns
- 📦 **Zero Configuration**: Works out of the box with your existing Hono setup
- 🎯 **Optimistic Updates**: Built-in support for optimistic mutations
- 🌊 **Infinite Queries**: Native support for paginated data with infinite scrolling
- 🛡️ **Error Handling**: Comprehensive error handling with structured error responses
- 🎣 **React Query Integration**: Built on top of TanStack React Query for robust state management

## Installation

```bash
npm install @scanpaigns/hono-query @tanstack/react-query hono
# or
yarn add @scanpaigns/hono-query @tanstack/react-query hono
# or
pnpm add @scanpaigns/hono-query @tanstack/react-query hono
```

## Quick Start

### 1. Set up the Provider

```tsx
import { QueryClient } from '@tanstack/react-query';
import { HonoQueryProvider } from '@scanpaigns/hono-query';
import { hc } from 'hono/client';
import type { AppType } from './server'; // Your Hono app type

const queryClient = new QueryClient();
const honoClient = hc<AppType>('http://localhost:3000');

function App() {
  return (
    <HonoQueryProvider queryClient={queryClient}>
      <YourApp />
    </HonoQueryProvider>
  );
}
```

### 2. Create API Client

```tsx
import { createHonoQueryProxy } from '@scanpaigns/hono-query';
import { hc } from 'hono/client';
import type { AppType } from './server';

const honoClient = hc<AppType>('http://localhost:3000');
export const api = createHonoQueryProxy(honoClient);
```

### 3. Use in Components

```tsx
import { api } from './lib/api';

function UserProfile({ userId }: { userId: string }) {
  // Query data
  const { data: user, isLoading, error } = api.users[':id'].useQuery(
    { param: { id: userId } },
    { enabled: !!userId }
  );

  // Method-specific mutations
  const updateUser = api.users[':id'].patch.useMutation({
    onSuccess: () => {
      console.log('User updated successfully!');
    }
  });

  const deleteUser = api.users[':id'].delete.useMutation();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <button 
        onClick={() => updateUser.mutate({ 
          param: { id: userId }, 
          json: { name: 'New Name' } 
        })}
      >
        Update User
      </button>
      <button onClick={() => deleteUser.mutate({ param: { id: userId } })}>
        Delete User
      </button>
    </div>
  );
}
```

## Core Concepts

### Query Hooks

Query hooks are automatically generated for any endpoint that supports GET requests:

```tsx
// Basic query
const { data, isLoading, error } = api.users.useQuery();

// Query with parameters
const { data: user } = api.users[':id'].useQuery({ 
  param: { id: '123' } 
});

// Query with query parameters
const { data: posts } = api.posts.useQuery({ 
  query: { page: 1, limit: 10 } 
});
```

### Method-Specific Mutations

Instead of a generic `useMutation`, hono-query provides method-specific hooks that automatically handle the correct HTTP method:

```tsx
// POST - Create new resource
const createPost = api.posts.post.useMutation();
createPost.mutate({ json: { title: 'New Post', content: '...' } });

// PATCH - Update existing resource
const updatePost = api.posts[':id'].patch.useMutation();
updatePost.mutate({ 
  param: { id: '123' }, 
  json: { title: 'Updated Title' } 
});

// DELETE - Remove resource
const deletePost = api.posts[':id'].delete.useMutation();
deletePost.mutate({ param: { id: '123' } });

// PUT - Replace resource
const replacePost = api.posts[':id'].put.useMutation();
replacePost.mutate({ 
  param: { id: '123' }, 
  json: { title: 'New Title', content: 'New Content' } 
});
```

### Infinite Queries

For paginated data with infinite scrolling:

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = api.posts.useInfiniteQuery(
  { query: { limit: 10 } },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

### Error Handling

The library provides structured error handling:

```tsx
import { HonoQueryError } from '@scanpaigns/hono-query';

const mutation = api.users.post.useMutation({
  onError: (error) => {
    if (error instanceof HonoQueryError) {
      console.log('Status:', error.response.status);
      console.log('Error data:', error.data);
    }
  }
});
```

### Cache Management

Automatic cache invalidation happens based on endpoint patterns:

- **Collection mutations** (`POST /users`) invalidate the collection cache (`/users`)
- **Resource mutations** (`PATCH /users/:id`) invalidate both the resource (`/users/:id`) and collection (`/users`)

You can also manually manage cache:

```tsx
import { useHonoQueryContext } from '@scanpaigns/hono-query';

function MyComponent() {
  const { utils } = useHonoQueryContext();
  
  // Manual cache invalidation
  const handleRefresh = () => {
    utils.users.invalidate();
  };
}
```

## Advanced Usage

### Type Inference

The library automatically infers types from your Hono app:

```tsx
import type { AppType } from './server';

// All these types are automatically inferred
type UserResponse = ApiOutputs<AppType>['users'][':id']; // GET response
type UserInput = ApiInputs<AppType>['users'][':id']; // GET input
type CreateUserInput = ApiMutationInputs<AppType>['users']; // POST input
type CreateUserOutput = ApiMutationOutputs<AppType>['users']; // POST output
```

### Custom Headers and Configuration

```tsx
const honoClient = hc<AppType>('http://localhost:3000', {
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value'
  },
  // Add dynamic headers
  headers: () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  })
});
```

### Optimistic Updates

```tsx
const updateUser = api.users[':id'].patch.useMutation({
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['users', variables.param.id] });
    
    // Snapshot previous value
    const previousUser = queryClient.getQueryData(['users', variables.param.id]);
    
    // Optimistically update
    queryClient.setQueryData(['users', variables.param.id], {
      ...previousUser,
      ...variables.json
    });
    
    return { previousUser };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['users', variables.param.id], 
      context?.previousUser
    );
  },
});
```

## API Reference

### Core Functions

- `createHonoQueryProxy<TApp>(client)` - Creates the main API proxy
- `HonoQueryProvider` - React context provider for the query client
- `useHonoQueryContext()` - Hook to access query client and utils

### Generated Hook Patterns

- `api.endpoint.useQuery(input?, options?)` - Query hook for GET requests
- `api.endpoint.useInfiniteQuery(input, options)` - Infinite query hook
- `api.endpoint.post.useMutation(options?)` - POST mutation hook
- `api.endpoint.put.useMutation(options?)` - PUT mutation hook  
- `api.endpoint.patch.useMutation(options?)` - PATCH mutation hook
- `api.endpoint.delete.useMutation(options?)` - DELETE mutation hook

### Type Exports

- `ApiOutputs<TApp>` - All GET response types
- `ApiInputs<TApp>` - All GET input types
- `ApiMutationOutputs<TApp>` - All mutation response types
- `ApiMutationInputs<TApp>` - All mutation input types
- `HonoQueryError` - Error class for failed requests

## Examples

See the [examples directory](./examples) for complete working examples:

- [Basic CRUD App](./examples/basic-crud)
- [Authentication Flow](./examples/auth-flow)  
- [Infinite Scrolling](./examples/infinite-scroll)
- [Optimistic Updates](./examples/optimistic-updates)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.