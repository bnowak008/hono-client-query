# Migration Guide

This guide helps you migrate from other popular React data fetching libraries to hono-query.

## Table of Contents

- [From tRPC](#from-trpc)
- [From Apollo Client](#from-apollo-client)
- [From React Query + Fetch](#from-react-query--fetch)
- [From SWR](#from-swr)
- [Breaking Changes](#breaking-changes)

## From tRPC

tRPC users will find hono-query very familiar, as both libraries provide type-safe APIs with automatic code generation.

### Key Differences

| Feature | tRPC | hono-query |
|---------|------|------------|
| Backend Framework | tRPC procedures | Hono routes |
| Type Inference | Automatic | Automatic |
| Method-Specific Hooks | `trpc.users.create.useMutation()` | `api.users.post.useMutation()` |
| Nested Routes | `trpc.posts.comments.list.useQuery()` | `api.posts.comments.useQuery()` |
| Cache Utils | `utils.users.invalidate()` | `utils.users.invalidate()` |

### Migration Steps

#### 1. Replace tRPC Client Setup

**Before (tRPC):**
```tsx
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './server';

export const trpc = createTRPCReact<AppRouter>();

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      url: 'http://localhost:3000/trpc',
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**After (hono-query):**
```tsx
import { HonoQueryProvider, createHonoQueryProxy } from '@scanpaigns/hono-query';
import { hc } from 'hono/client';
import type { AppType } from './server';

const honoClient = hc<AppType>('http://localhost:3000');
export const api = createHonoQueryProxy(honoClient);

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <HonoQueryProvider queryClient={queryClient}>
      <YourApp />
    </HonoQueryProvider>
  );
}
```

#### 2. Update Query Patterns

**Before (tRPC):**
```tsx
// Query all users
const { data: users } = trpc.users.list.useQuery();

// Query user by ID
const { data: user } = trpc.users.byId.useQuery({ id: '123' });

// Query with input validation
const { data: posts } = trpc.posts.list.useQuery({
  page: 1,
  limit: 10,
  category: 'tech'
});
```

**After (hono-query):**
```tsx
// Query all users
const { data: users } = api.users.useQuery();

// Query user by ID
const { data: user } = api.users[':id'].useQuery({ 
  param: { id: '123' } 
});

// Query with input validation
const { data: posts } = api.posts.useQuery({
  query: {
    page: 1,
    limit: 10,
    category: 'tech'
  }
});
```

#### 3. Update Mutation Patterns

**Before (tRPC):**
```tsx
// Create user
const createUser = trpc.users.create.useMutation({
  onSuccess: () => {
    utils.users.list.invalidate();
  }
});

createUser.mutate({
  name: 'John Doe',
  email: 'john@example.com'
});

// Update user
const updateUser = trpc.users.update.useMutation();
updateUser.mutate({
  id: '123',
  name: 'Jane Doe'
});

// Delete user
const deleteUser = trpc.users.delete.useMutation();
deleteUser.mutate({ id: '123' });
```

**After (hono-query):**
```tsx
// Create user
const createUser = api.users.post.useMutation({
  onSuccess: () => {
    // Cache automatically invalidated
  }
});

createUser.mutate({
  json: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// Update user
const updateUser = api.users[':id'].patch.useMutation();
updateUser.mutate({
  param: { id: '123' },
  json: { name: 'Jane Doe' }
});

// Delete user
const deleteUser = api.users[':id'].delete.useMutation();
deleteUser.mutate({ param: { id: '123' } });
```

#### 4. Update Cache Management

**Before (tRPC):**
```tsx
const utils = trpc.useUtils();

// Invalidate queries
utils.users.list.invalidate();
utils.users.byId.invalidate({ id: '123' });

// Set query data
utils.users.byId.setData({ id: '123' }, newUserData);

// Get query data
const userData = utils.users.byId.getData({ id: '123' });
```

**After (hono-query):**
```tsx
const { utils } = useHonoQueryContext();

// Invalidate queries
utils.users.invalidate();
utils.users[':id'].invalidate();

// Use React Query directly for data manipulation
const queryClient = useQueryClient();
queryClient.setQueryData(['users', ':id', { param: { id: '123' } }], newUserData);
queryClient.getQueryData(['users', ':id', { param: { id: '123' } }]);
```

#### 5. Update Infinite Queries

**Before (tRPC):**
```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
} = trpc.posts.infiniteList.useInfiniteQuery(
  { limit: 10 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

**After (hono-query):**
```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
} = api.posts.useInfiniteQuery(
  { query: { limit: 10 } },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

## From Apollo Client

Apollo Client users will need to adapt from GraphQL patterns to REST-like patterns.

### Key Differences

| Feature | Apollo Client | hono-query |
|---------|---------------|------------|
| Query Language | GraphQL | REST endpoints |
| Type Generation | GraphQL Codegen | Automatic from Hono |
| Caching | Normalized cache | React Query cache |
| Mutations | GraphQL mutations | HTTP methods |
| Optimistic Updates | Apollo optimistic | React Query optimistic |

### Migration Steps

#### 1. Replace Apollo Setup

**Before (Apollo):**
```tsx
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:3000/graphql',
  cache: new InMemoryCache()
});

function App() {
  return (
    <ApolloProvider client={client}>
      <YourApp />
    </ApolloProvider>
  );
}
```

**After (hono-query):**
```tsx
import { QueryClient } from '@tanstack/react-query';
import { HonoQueryProvider, createHonoQueryProxy } from '@scanpaigns/hono-query';
import { hc } from 'hono/client';
import type { AppType } from './server';

const queryClient = new QueryClient();
const honoClient = hc<AppType>('http://localhost:3000');
export const api = createHonoQueryProxy(honoClient);

function App() {
  return (
    <HonoQueryProvider queryClient={queryClient}>
      <YourApp />
    </HonoQueryProvider>
  );
}
```

#### 2. Update Query Patterns

**Before (Apollo):**
```tsx
import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`;

function UsersList() {
  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { limit: 10, offset: 0 }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

**After (hono-query):**
```tsx
import { api } from '@/lib/api';

function UsersList() {
  const { data: users, isLoading, error } = api.users.useQuery({
    query: { limit: 10, offset: 0 }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

#### 3. Update Mutation Patterns

**Before (Apollo):**
```tsx
import { useMutation, gql } from '@apollo/client';

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

function CreateUserForm() {
  const [createUser, { loading }] = useMutation(CREATE_USER, {
    refetchQueries: ['GetUsers']
  });

  const handleSubmit = (formData) => {
    createUser({
      variables: { input: formData }
    });
  };
}
```

**After (hono-query):**
```tsx
import { api } from '@/lib/api';

function CreateUserForm() {
  const createUser = api.users.post.useMutation({
    // Cache automatically invalidated
  });

  const handleSubmit = (formData) => {
    createUser.mutate({
      json: formData
    });
  };
}
```

#### 4. Update Cache Management

**Before (Apollo):**
```tsx
import { useApolloClient } from '@apollo/client';

function MyComponent() {
  const client = useApolloClient();

  const updateCache = () => {
    client.writeQuery({
      query: GET_USERS,
      data: { users: newUsersData }
    });
  };

  const refetchData = () => {
    client.refetchQueries({
      include: ['GetUsers']
    });
  };
}
```

**After (hono-query):**
```tsx
import { useHonoQueryContext } from '@scanpaigns/hono-query';
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const { utils } = useHonoQueryContext();
  const queryClient = useQueryClient();

  const updateCache = () => {
    queryClient.setQueryData(['users'], newUsersData);
  };

  const refetchData = () => {
    utils.users.invalidate();
  };
}
```

## From React Query + Fetch

Users already familiar with React Query will find the transition straightforward.

### Migration Steps

#### 1. Replace Manual Query Definitions

**Before (React Query + Fetch):**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });
}

function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}
```

**After (hono-query):**
```tsx
import { api } from '@/lib/api';

function MyComponent() {
  // Query is automatically generated
  const { data: users } = api.users.useQuery();
  
  // Mutation is automatically generated with cache invalidation
  const createUser = api.users.post.useMutation();
}
```

#### 2. Simplify Error Handling

**Before (React Query + Fetch):**
```tsx
const { data, error } = useQuery({
  queryKey: ['users', userId],
  queryFn: async () => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || response.statusText);
    }
    return response.json();
  }
});

if (error) {
  // Manual error parsing
  console.log('Error:', error.message);
}
```

**After (hono-query):**
```tsx
import { HonoQueryError } from '@scanpaigns/hono-query';

const { data, error } = api.users[':id'].useQuery({
  param: { id: userId }
});

if (error instanceof HonoQueryError) {
  // Structured error with response and data
  console.log('Status:', error.response.status);
  console.log('Error data:', error.data);
}
```

## From SWR

SWR users will need to adapt to React Query patterns and hono-query's type safety.

### Key Differences

| Feature | SWR | hono-query |
|---------|-----|------------|
| Hook Pattern | `useSWR(key, fetcher)` | `api.endpoint.useQuery()` |
| Mutations | Manual `mutate()` | Method-specific hooks |
| Type Safety | Manual typing | Automatic inference |
| Cache Keys | Manual strings | Auto-generated |

### Migration Steps

#### 1. Replace SWR Queries

**Before (SWR):**
```tsx
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

function UserProfile({ userId }) {
  const { data: user, error } = useSWR(`/api/users/${userId}`, fetcher);
  const { data: posts } = useSWR(`/api/users/${userId}/posts`, fetcher);

  if (error) return <div>Failed to load</div>;
  if (!user) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}
```

**After (hono-query):**
```tsx
import { api } from '@/lib/api';

function UserProfile({ userId }) {
  const { data: user, error } = api.users[':id'].useQuery({
    param: { id: userId }
  });
  const { data: posts } = api.users[':id'].posts.useQuery({
    param: { id: userId }
  });

  if (error) return <div>Failed to load</div>;
  if (!user) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}
```

#### 2. Replace SWR Mutations

**Before (SWR):**
```tsx
import useSWR, { mutate } from 'swr';

function UserForm({ userId }) {
  const { data: user } = useSWR(`/api/users/${userId}`, fetcher);

  const updateUser = async (formData) => {
    // Optimistic update
    mutate(`/api/users/${userId}`, { ...user, ...formData }, false);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      // Revalidate
      mutate(`/api/users/${userId}`);
    } catch (error) {
      // Rollback
      mutate(`/api/users/${userId}`, user, false);
      throw error;
    }
  };
}
```

**After (hono-query):**
```tsx
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

function UserForm({ userId }) {
  const { data: user } = api.users[':id'].useQuery({
    param: { id: userId }
  });

  const updateUser = api.users[':id'].patch.useMutation({
    onMutate: async (variables) => {
      // Optimistic update (built-in)
      const queryClient = useQueryClient();
      await queryClient.cancelQueries(['users', ':id', { param: { id: userId } }]);
      
      const previousUser = queryClient.getQueryData(['users', ':id', { param: { id: userId } }]);
      
      queryClient.setQueryData(['users', ':id', { param: { id: userId } }], {
        ...user,
        ...variables.json
      });
      
      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Automatic rollback
      queryClient.setQueryData(['users', ':id', { param: { id: userId } }], context?.previousUser);
    }
  });

  const handleSubmit = (formData) => {
    updateUser.mutate({
      param: { id: userId },
      json: formData
    });
  };
}
```

## Breaking Changes

### Version 1.x to 2.x

#### Method-Specific Mutations

**Before (v1.x):**
```tsx
const mutation = api.users[':id'].useMutation();
mutation.mutate({
  method: 'PATCH',
  param: { id: '123' },
  json: { name: 'New Name' }
});
```

**After (v2.x):**
```tsx
const updateUser = api.users[':id'].patch.useMutation();
updateUser.mutate({
  param: { id: '123' },
  json: { name: 'New Name' }
});
```

#### Error Handling

**Before (v1.x):**
```tsx
// Errors were plain Error objects
if (error) {
  console.log(error.message);
}
```

**After (v2.x):**
```tsx
// Structured error objects
if (error instanceof HonoQueryError) {
  console.log('Status:', error.response.status);
  console.log('Data:', error.data);
}
```

#### Cache Keys

**Before (v1.x):**
```tsx
// Cache keys were simpler
queryClient.invalidateQueries(['users']);
```

**After (v2.x):**
```tsx
// Cache keys include input parameters
queryClient.invalidateQueries(['users', input]);
```

## Migration Checklist

- [ ] Update package dependencies
- [ ] Replace client setup code
- [ ] Convert query hooks to new patterns
- [ ] Update mutation hooks to method-specific versions
- [ ] Update error handling for HonoQueryError
- [ ] Test cache invalidation patterns
- [ ] Update TypeScript types
- [ ] Review and update optimistic update patterns
- [ ] Test infinite query implementations
- [ ] Update cache management utilities

This migration guide should help you transition smoothly to hono-query while taking advantage of its type safety and developer experience improvements. 