# Quick Reference

A quick reference guide for common hono-query patterns and use cases.

## Setup

```tsx
// 1. Install
npm install @scanpaigns/hono-query @tanstack/react-query hono

// 2. Create client
import { hc } from 'hono/client';
import { createHonoQueryProxy } from '@scanpaigns/hono-query';
import type { AppType } from './server';

const honoClient = hc<AppType>('http://localhost:3000');
export const api = createHonoQueryProxy(honoClient);

// 3. Setup provider
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

## Query Patterns

```tsx
// Basic query
const { data, isLoading, error } = api.users.useQuery();

// Query with path params
const { data: user } = api.users[':id'].useQuery({ 
  param: { id: userId } 
});

// Query with query params
const { data: posts } = api.posts.useQuery({
  query: { page: 1, limit: 10, category: 'tech' }
});

// Query with headers
const { data } = api.profile.useQuery({
  header: { 'x-user-id': userId }
});

// Conditional query
const { data } = api.users[':id'].useQuery(
  { param: { id: userId } },
  { enabled: !!userId }
);

// Query with custom options
const { data } = api.users.useQuery(undefined, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  retry: 3
});
```

## Mutation Patterns

```tsx
// Create (POST)
const createUser = api.users.post.useMutation({
  onSuccess: (data) => console.log('Created:', data),
  onError: (error) => console.error('Failed:', error)
});
createUser.mutate({ json: { name: 'John', email: 'john@example.com' } });

// Update (PATCH)
const updateUser = api.users[':id'].patch.useMutation();
updateUser.mutate({
  param: { id: userId },
  json: { name: 'Updated Name' }
});

// Replace (PUT)
const replaceUser = api.users[':id'].put.useMutation();
replaceUser.mutate({
  param: { id: userId },
  json: { name: 'John', email: 'john@example.com' }
});

// Delete
const deleteUser = api.users[':id'].delete.useMutation();
deleteUser.mutate({ param: { id: userId } });

// Mutation with optimistic update
const updateUser = api.users[':id'].patch.useMutation({
  onMutate: async (variables) => {
    await queryClient.cancelQueries(['users', ':id']);
    const previousUser = queryClient.getQueryData(['users', ':id', variables]);
    queryClient.setQueryData(['users', ':id', variables], {
      ...previousUser,
      ...variables.json
    });
    return { previousUser };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['users', ':id', variables], context?.previousUser);
  }
});
```

## Infinite Queries

```tsx
// Basic infinite query
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = api.posts.useInfiniteQuery(
  { query: { limit: 10 } },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);

// Access all pages
const allPosts = data?.pages.flatMap(page => page.items) ?? [];

// Load more button
<button 
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
>
  {isFetchingNextPage ? 'Loading...' : 'Load More'}
</button>

// Auto-load with intersection observer
const { ref, inView } = useInView();

useEffect(() => {
  if (inView && hasNextPage) {
    fetchNextPage();
  }
}, [inView, fetchNextPage, hasNextPage]);

return (
  <div>
    {allPosts.map(post => <PostCard key={post.id} post={post} />)}
    <div ref={ref} />
  </div>
);
```

## Error Handling

```tsx
import { HonoQueryError } from '@scanpaigns/hono-query';

// In queries
const { data, error } = api.users.useQuery();

if (error instanceof HonoQueryError) {
  switch (error.response.status) {
    case 401:
      return <LoginPrompt />;
    case 403:
      return <AccessDenied />;
    case 404:
      return <NotFound />;
    default:
      return <ErrorMessage message={error.message} />;
  }
}

// In mutations
const mutation = api.users.post.useMutation({
  onError: (error) => {
    if (error instanceof HonoQueryError) {
      if (error.response.status === 400) {
        // Handle validation errors
        setFormErrors(error.data.errors);
      } else {
        toast.error(error.message);
      }
    }
  }
});
```

## Cache Management

```tsx
import { useHonoQueryContext } from '@scanpaigns/hono-query';
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const { utils } = useHonoQueryContext();
  const queryClient = useQueryClient();

  // Invalidate queries
  const refreshUsers = () => utils.users.invalidate();
  const refreshUser = () => utils.users[':id'].invalidate();

  // Manual cache updates
  const updateUserCache = (userId: string, userData: User) => {
    queryClient.setQueryData(['users', ':id', { param: { id: userId } }], userData);
  };

  // Get cached data
  const getCachedUser = (userId: string) => {
    return queryClient.getQueryData(['users', ':id', { param: { id: userId } }]);
  };

  // Remove from cache
  const removeUserFromCache = (userId: string) => {
    queryClient.removeQueries(['users', ':id', { param: { id: userId } }]);
  };
}
```

## Type Usage

```tsx
import type { 
  ApiOutputs, 
  ApiInputs, 
  ApiMutationInputs,
  ApiMutationOutputs 
} from '@scanpaigns/hono-query';
import type { AppType } from './server';

// Extract types
type User = ApiOutputs<AppType>['users'][':id'];
type UserInput = ApiInputs<AppType>['users'][':id'];
type CreateUserInput = ApiMutationInputs<AppType>['users'];
type CreateUserOutput = ApiMutationOutputs<AppType>['users'];

// Use in components
function UserCard({ user }: { user: User }) {
  // TypeScript knows the shape of user
  return <div>{user.name}</div>;
}

function CreateUserForm({ onSuccess }: { 
  onSuccess: (user: CreateUserOutput) => void 
}) {
  const createUser = api.users.post.useMutation({
    onSuccess
  });
  // ...
}
```

## Common Patterns

### Loading States

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, isError } = api.users[':id'].useQuery({
    param: { id: userId }
  });

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState />;
  if (!user) return <NotFound />;

  return <ProfileView user={user} />;
}
```

### Form with Mutation

```tsx
function EditUserForm({ user }: { user: User }) {
  const [formData, setFormData] = useState(user);

  const updateUser = api.users[':id'].patch.useMutation({
    onSuccess: () => {
      toast.success('User updated!');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      param: { id: user.id },
      json: formData
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      />
      <button type="submit" disabled={updateUser.isPending}>
        {updateUser.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Master-Detail View

```tsx
function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const { data: users } = api.users.useQuery();
  const { data: selectedUser } = api.users[':id'].useQuery(
    { param: { id: selectedUserId! } },
    { enabled: !!selectedUserId }
  );

  return (
    <div className="flex">
      <UsersList 
        users={users} 
        onSelect={setSelectedUserId}
        selectedId={selectedUserId}
      />
      {selectedUser && <UserDetail user={selectedUser} />}
    </div>
  );
}
```

### Search with Debouncing

```tsx
function SearchUsers() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = api.users.search.useQuery(
    { query: { q: debouncedQuery } },
    { enabled: debouncedQuery.length >= 2 }
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {isLoading && <div>Searching...</div>}
      {results?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

### Nested Resources

```tsx
function UserPosts({ userId }: { userId: string }) {
  // Query user's posts
  const { data: posts } = api.users[':id'].posts.useQuery({
    param: { id: userId }
  });

  // Add post to user
  const addPost = api.users[':id'].posts.post.useMutation();

  // Update specific post
  const updatePost = api.users[':userId'].posts[':id'].patch.useMutation();

  // Delete specific post
  const deletePost = api.users[':userId'].posts[':id'].delete.useMutation();

  const handleAddPost = (postData: CreatePostInput) => {
    addPost.mutate({
      param: { id: userId },
      json: postData
    });
  };

  const handleUpdatePost = (postId: string, updates: UpdatePostInput) => {
    updatePost.mutate({
      param: { userId, id: postId },
      json: updates
    });
  };

  const handleDeletePost = (postId: string) => {
    deletePost.mutate({
      param: { userId, id: postId }
    });
  };

  return (
    <div>
      <AddPostForm onSubmit={handleAddPost} />
      {posts?.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onUpdate={(updates) => handleUpdatePost(post.id, updates)}
          onDelete={() => handleDeletePost(post.id)}
        />
      ))}
    </div>
  );
}
```

## Configuration

### Custom Headers

```tsx
const honoClient = hc<AppType>('http://localhost:3000', {
  headers: () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'X-Client-Version': '1.0.0'
  })
});
```

### Query Client Configuration

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof HonoQueryError && error.response.status === 404) {
          return false; // Don't retry 404s
        }
        return failureCount < 3;
      }
    },
    mutations: {
      retry: 1
    }
  }
});
```

This quick reference covers the most common patterns you'll use with hono-query. For more detailed examples and advanced use cases, see the full [Examples documentation](EXAMPLES.md). 