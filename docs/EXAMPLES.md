# Examples

This document provides comprehensive examples of using hono-query in real-world scenarios.

## Table of Contents

- [Basic CRUD Operations](#basic-crud-operations)
- [Authentication Flow](#authentication-flow)
- [Infinite Scrolling](#infinite-scrolling)
- [Optimistic Updates](#optimistic-updates)
- [Real-time Updates](#real-time-updates)
- [File Uploads](#file-uploads)
- [Error Handling](#error-handling)
- [Complex Nested APIs](#complex-nested-apis)

## Basic CRUD Operations

### Setup

```tsx
// server/types.ts
export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
};

// client/lib/api.ts
import { hc } from 'hono/client';
import { createHonoQueryProxy } from '@scanpaigns/hono-query';
import type { AppType } from '../server';

const honoClient = hc<AppType>('http://localhost:3000');
export const api = createHonoQueryProxy(honoClient);
```

### User Management Component

```tsx
// components/UserManagement.tsx
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function UserManagement() {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  // Query all users
  const { 
    data: users, 
    isLoading, 
    error 
  } = api.users.useQuery();
  
  // Create user mutation
  const createUser = api.users.post.useMutation({
    onSuccess: () => {
      toast.success('User created successfully');
      setNewUserForm({ name: '', email: '' });
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });
  
  // Update user mutation
  const updateUser = api.users[':id'].patch.useMutation({
    onSuccess: () => {
      toast.success('User updated successfully');
      setEditingUser(null);
    }
  });
  
  // Delete user mutation
  const deleteUser = api.users[':id'].delete.useMutation({
    onSuccess: () => {
      toast.success('User deleted successfully');
    }
  });
  
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: ''
  });
  
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({
      json: newUserForm
    });
  };
  
  const handleUpdateUser = (id: string, updates: Partial<User>) => {
    updateUser.mutate({
      param: { id },
      json: updates
    });
  };
  
  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate({ param: { id } });
    }
  };
  
  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <form onSubmit={handleCreateUser} className="space-y-4">
        <h2>Create New User</h2>
        <input
          type="text"
          placeholder="Name"
          value={newUserForm.name}
          onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={newUserForm.email}
          onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
          required
        />
        <button 
          type="submit" 
          disabled={createUser.isPending}
        >
          {createUser.isPending ? 'Creating...' : 'Create User'}
        </button>
      </form>
      
      {/* Users List */}
      <div className="space-y-4">
        <h2>Users ({users?.length})</h2>
        {users?.map(user => (
          <UserCard
            key={user.id}
            user={user}
            isEditing={editingUser === user.id}
            onEdit={() => setEditingUser(user.id)}
            onCancelEdit={() => setEditingUser(null)}
            onSave={(updates) => handleUpdateUser(user.id, updates)}
            onDelete={() => handleDeleteUser(user.id)}
            isUpdating={updateUser.isPending}
            isDeleting={deleteUser.isPending}
          />
        ))}
      </div>
    </div>
  );
}
```

### User Detail Component

```tsx
// components/UserDetail.tsx
import { api } from '@/lib/api';

type UserDetailProps = {
  userId: string;
};

export function UserDetail({ userId }: UserDetailProps) {
  // Query specific user
  const { 
    data: user, 
    isLoading, 
    error 
  } = api.users[':id'].useQuery(
    { param: { id: userId } },
    { enabled: !!userId }
  );
  
  // Query user's posts
  const { data: posts } = api.users[':id'].posts.useQuery(
    { param: { id: userId } },
    { enabled: !!userId }
  );
  
  if (isLoading) return <UserDetailSkeleton />;
  if (error) return <div>User not found</div>;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        {user.avatar && (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-600">{user.email}</p>
          <p className="text-sm text-gray-500">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Posts ({posts?.length || 0})</h2>
        {posts?.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
```

## Authentication Flow

### Auth Provider with hono-query

```tsx
// providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  
  // Get current user
  const { data: currentUser } = api.auth.me.useQuery(undefined, {
    retry: false,
    onSuccess: (data) => {
      setUser(data);
      setIsLoading(false);
    },
    onError: () => {
      setUser(null);
      setIsLoading(false);
    }
  });
  
  // Login mutation
  const loginMutation = api.auth.login.post.useMutation({
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('token', data.token);
      setUser(data.user);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries(['auth', 'me']);
    }
  });
  
  // Logout mutation
  const logoutMutation = api.auth.logout.post.useMutation({
    onSuccess: () => {
      localStorage.removeItem('token');
      setUser(null);
      
      // Clear all cached data
      queryClient.clear();
    }
  });
  
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({
      json: { email, password }
    });
  };
  
  const logout = () => {
    logoutMutation.mutate({ json: {} });
  };
  
  useEffect(() => {
    setUser(currentUser || null);
  }, [currentUser]);
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Login Component

```tsx
// components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { HonoQueryError } from '@scanpaigns/hono-query';

export function LoginForm() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      if (err instanceof HonoQueryError) {
        switch (err.response.status) {
          case 401:
            setError('Invalid email or password');
            break;
          case 429:
            setError('Too many login attempts. Please try again later.');
            break;
          default:
            setError('Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center">Login</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        required
        className="w-full px-3 py-2 border rounded-md"
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        required
        className="w-full px-3 py-2 border rounded-md"
      />
      
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Infinite Scrolling

### Posts Feed with Infinite Scroll

```tsx
// components/PostsFeed.tsx
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { api } from '@/lib/api';

type PostsFeedProps = {
  category?: string;
  authorId?: string;
};

export function PostsFeed({ category, authorId }: PostsFeedProps) {
  const { ref, inView } = useInView();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = api.posts.useInfiniteQuery(
    {
      query: {
        limit: 10,
        ...(category && { category }),
        ...(authorId && { authorId })
      }
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.nextCursor : undefined;
      },
      enabled: true,
    }
  );
  
  // Auto-fetch next page when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (error) {
    return <div>Error loading posts: {error.message}</div>;
  }
  
  const allPosts = data?.pages.flatMap(page => page.items) ?? [];
  
  return (
    <div className="space-y-6">
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Intersection observer target */}
      <div ref={ref} className="h-10" />
      
      {!hasNextPage && allPosts.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          You've reached the end!
        </div>
      )}
    </div>
  );
}
```

### Search with Infinite Results

```tsx
// components/SearchResults.tsx
import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

export function SearchResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: 'all',
    dateRange: '7d'
  });
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  const searchEnabled = debouncedQuery.length >= 2;
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = api.search.useInfiniteQuery(
    {
      query: {
        q: debouncedQuery,
        type: selectedFilters.type,
        dateRange: selectedFilters.dateRange,
        limit: 20
      }
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      enabled: searchEnabled,
    }
  );
  
  const searchResults = useMemo(() => {
    return data?.pages.flatMap(page => page.results) ?? [];
  }, [data]);
  
  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={selectedFilters.type}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Types</option>
            <option value="posts">Posts</option>
            <option value="users">Users</option>
            <option value="comments">Comments</option>
          </select>
          
          <select
            value={selectedFilters.dateRange}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last week</option>
            <option value="30d">Last month</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
      
      {/* Results */}
      {!searchEnabled && (
        <div className="text-center text-gray-500 py-8">
          Enter at least 2 characters to search
        </div>
      )}
      
      {searchEnabled && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
      )}
      
      {searchEnabled && searchResults.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">
          No results found for "{debouncedQuery}"
        </div>
      )}
      
      {searchResults.map((result) => (
        <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
      ))}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load more results'}
        </button>
      )}
    </div>
  );
}
```

## Optimistic Updates

### Real-time Like System

```tsx
// components/PostCard.tsx
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient();
  
  // Like/unlike mutation with optimistic updates
  const toggleLike = api.posts[':id'].like.post.useMutation({
    onMutate: async (variables) => {
      const postId = variables.param.id;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['posts', postId]);
      await queryClient.cancelQueries(['posts']);
      
      // Snapshot previous values
      const previousPost = queryClient.getQueryData(['posts', postId]);
      const previousPosts = queryClient.getQueryData(['posts']);
      
      // Optimistically update individual post
      queryClient.setQueryData(['posts', postId], (old: Post | undefined) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1
        };
      });
      
      // Optimistically update posts list
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((p: Post) => 
              p.id === postId 
                ? {
                    ...p,
                    isLiked: !p.isLiked,
                    likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1
                  }
                : p
            )
          }))
        };
      });
      
      return { previousPost, previousPosts };
    },
    onError: (err, variables, context) => {
      const postId = variables.param.id;
      
      // Rollback optimistic updates
      if (context?.previousPost) {
        queryClient.setQueryData(['posts', postId], context.previousPost);
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      toast.error('Failed to update like');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      const postId = variables.param.id;
      queryClient.invalidateQueries(['posts', postId]);
      queryClient.invalidateQueries(['posts']);
    }
  });
  
  const handleToggleLike = () => {
    toggleLike.mutate({
      param: { id: post.id }
    });
  };
  
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <img 
          src={post.author.avatar} 
          alt={post.author.name}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <h3 className="font-semibold">{post.author.name}</h3>
          <p className="text-sm text-gray-500">{post.createdAt}</p>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">{post.title}</h2>
        <p className="text-gray-700">{post.content}</p>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handleToggleLike}
          disabled={toggleLike.isPending}
          className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
            post.isLiked 
              ? 'bg-red-100 text-red-600' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <HeartIcon filled={post.isLiked} />
          <span>{post.likeCount}</span>
        </button>
        
        <button className="flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
          <CommentIcon />
          <span>{post.commentCount}</span>
        </button>
      </div>
    </div>
  );
}
```

### Comment System with Optimistic Updates

```tsx
// components/CommentSection.tsx
import { useState } from 'react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';

type CommentSectionProps = {
  postId: string;
};

export function CommentSection({ postId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Query comments
  const { data: comments, isLoading } = api.posts[':id'].comments.useQuery({
    param: { id: postId }
  });
  
  // Add comment with optimistic update
  const addComment = api.posts[':id'].comments.post.useMutation({
    onMutate: async (variables) => {
      await queryClient.cancelQueries(['posts', postId, 'comments']);
      
      const previousComments = queryClient.getQueryData(['posts', postId, 'comments']);
      
      // Create optimistic comment
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        content: variables.json.content,
        author: user!,
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };
      
      // Add optimistic comment
      queryClient.setQueryData(['posts', postId, 'comments'], (old: Comment[] | undefined) => {
        return old ? [optimisticComment, ...old] : [optimisticComment];
      });
      
      return { previousComments };
    },
    onSuccess: (newComment) => {
      // Replace optimistic comment with real one
      queryClient.setQueryData(['posts', postId, 'comments'], (old: Comment[] | undefined) => {
        if (!old) return [newComment];
        return old.map(comment => 
          comment.isOptimistic ? newComment : comment
        );
      });
      setNewComment('');
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousComments) {
        queryClient.setQueryData(['posts', postId, 'comments'], context.previousComments);
      }
      toast.error('Failed to add comment');
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    addComment.mutate({
      param: { id: postId },
      json: { content: newComment.trim() }
    });
  };
  
  if (isLoading) return <CommentsSkeleton />;
  
  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-3 py-2 border rounded-md resize-none"
          rows={3}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || addComment.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {addComment.isPending ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
      
      {/* Comments List */}
      <div className="space-y-4">
        {comments?.map((comment) => (
          <div 
            key={comment.id} 
            className={`border-l-4 pl-4 ${
              comment.isOptimistic ? 'border-blue-200 opacity-70' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <img 
                src={comment.author.avatar} 
                alt={comment.author.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-semibold">{comment.author.name}</span>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.isOptimistic && (
                <span className="text-xs text-blue-500">Posting...</span>
              )}
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## File Uploads

### File Upload with Progress

```tsx
// components/FileUpload.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';

type FileUploadProps = {
  onUploadSuccess: (file: UploadedFile) => void;
  acceptedTypes?: string[];
  maxSize?: number;
};

export function FileUpload({ 
  onUploadSuccess, 
  acceptedTypes = ['image/*'],
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const uploadFile = api.files.post.useMutation({
    onSuccess: (data) => {
      onUploadSuccess(data);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[data.originalName];
        return newProgress;
      });
    },
    onError: (error, variables) => {
      toast.error(`Upload failed: ${error.message}`);
      const fileName = (variables.form?.get('file') as File)?.name;
      if (fileName) {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileName];
          return newProgress;
        });
      }
    }
  });
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      
      // Initialize progress
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate upload progress (in real app, use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[file.name] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [file.name]: currentProgress + 10 };
        });
      }, 200);
      
      try {
        await uploadFile.mutateAsync({
          form: formData
        });
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        clearInterval(progressInterval);
      }
    }
  }, [uploadFile]);
  
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: true
  });
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supports: {acceptedTypes.join(', ')} (max {formatFileSize(maxSize)})
            </p>
          </div>
        )}
      </div>
      
      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-red-600 text-sm">
              {file.name}: {errors.map(e => e.message).join(', ')}
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Uploading files:</h3>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Complex Nested APIs

### Campaign Management with Nested Resources

```tsx
// components/CampaignManager.tsx
import { useState } from 'react';
import { api } from '@/lib/api';

type CampaignManagerProps = {
  campaignId: string;
};

export function CampaignManager({ campaignId }: CampaignManagerProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  // Query campaign details
  const { data: campaign } = api.campaigns[':id'].useQuery({
    param: { id: campaignId }
  });
  
  // Query campaign touchpoints
  const { data: touchpoints } = api.campaigns[':id'].touchpoints.useQuery({
    param: { id: campaignId }
  });
  
  // Query campaign analytics
  const { data: analytics } = api.campaigns[':id'].analytics.useQuery({
    param: { id: campaignId },
    query: { timeRange: '30d' }
  });
  
  // Mutations for touchpoint management
  const addTouchpoint = api.campaigns[':id'].touchpoints.post.useMutation({
    onSuccess: () => {
      toast.success('Touchpoint added successfully');
    }
  });
  
  const updateTouchpoint = api.campaigns[':id'].touchpoints[':touchpointId'].patch.useMutation({
    onSuccess: () => {
      toast.success('Touchpoint updated successfully');
    }
  });
  
  const removeTouchpoint = api.campaigns[':id'].touchpoints[':touchpointId'].delete.useMutation({
    onSuccess: () => {
      toast.success('Touchpoint removed successfully');
    }
  });
  
  const handleAddTouchpoint = (touchpointData: CreateTouchpointInput) => {
    addTouchpoint.mutate({
      param: { id: campaignId },
      json: touchpointData
    });
  };
  
  const handleUpdateTouchpoint = (touchpointId: string, updates: UpdateTouchpointInput) => {
    updateTouchpoint.mutate({
      param: { id: campaignId, touchpointId },
      json: updates
    });
  };
  
  const handleRemoveTouchpoint = (touchpointId: string) => {
    if (confirm('Are you sure you want to remove this touchpoint?')) {
      removeTouchpoint.mutate({
        param: { id: campaignId, touchpointId }
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold">{campaign?.name}</h1>
        <p className="text-gray-600 mt-2">{campaign?.description}</p>
        <div className="flex space-x-4 mt-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {campaign?.status}
          </span>
          <span className="text-sm text-gray-500">
            {touchpoints?.length || 0} touchpoints
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['details', 'touchpoints', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'details' && (
            <CampaignDetails campaign={campaign} />
          )}
          
          {activeTab === 'touchpoints' && (
            <TouchpointManager
              touchpoints={touchpoints}
              onAdd={handleAddTouchpoint}
              onUpdate={handleUpdateTouchpoint}
              onRemove={handleRemoveTouchpoint}
              isAdding={addTouchpoint.isPending}
              isUpdating={updateTouchpoint.isPending}
              isRemoving={removeTouchpoint.isPending}
            />
          )}
          
          {activeTab === 'analytics' && (
            <CampaignAnalytics analytics={analytics} />
          )}
        </div>
      </div>
    </div>
  );
}
```

This comprehensive set of examples demonstrates the power and flexibility of hono-query in real-world scenarios. Each example shows different aspects of the library while maintaining type safety and providing excellent developer experience. 