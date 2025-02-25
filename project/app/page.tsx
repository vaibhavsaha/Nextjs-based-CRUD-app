'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, Plus, LogOut, UserPlus } from 'lucide-react';
import { Post, postSchema, User } from '@/lib/types';
import { getPosts, createPost, updatePost, deletePost } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCurrentUser, signOut, getSession } from '@/lib/auth';
import { AuthForm } from './auth/auth-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

function PostList({ user, onEdit, onDelete }: { 
  user: User; 
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
}) {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/15 p-4 text-destructive">
        <span>Error: {(error as Error).message}</span>
      </div>
    );
  }

  const filteredPosts = posts.filter(post => {
    if (user.isAnonymous) {
      return post.user_id === localStorage.getItem('anonymousUserId');
    }
    return true;
  });

  return (
    <div className="grid gap-4">
      {filteredPosts.map((post) => {
        const isOwner = post.user_id === (user.isAnonymous ? localStorage.getItem('anonymousUserId') : user.id);
        
        return (
          <div
            key={post.id}
            className="rounded-lg bg-card p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold text-primary">{post.title}</h2>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    className="rounded-full p-2 hover:bg-muted transition-colors"
                    onClick={() => onEdit(post)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="rounded-full p-2 hover:bg-destructive/10 text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this post? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(post.id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{post.body}</p>
          </div>
        );
      })}
      {filteredPosts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No posts yet. Create your first post!
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const [pendingPost, setPendingPost] = useState<Post | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<Post>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      body: '',
      user_id: '',
    },
  });

  useEffect(() => {
    setMounted(true);
    
    const initializeAuth = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          const storedAnonymousUser = localStorage.getItem('anonymousUser');
          if (storedAnonymousUser) {
            setUser(JSON.parse(storedAnonymousUser));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      if (user?.isAnonymous) {
        localStorage.removeItem('anonymousUser');
        setUser(null);
      } else {
        await signOut();
        setUser(null);
      }
      queryClient.clear();
      toast({ title: 'Success', description: 'You have been signed out' });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleTitleClick = () => {
    handleSignOut();
  };

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Success', description: 'Post created successfully' });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (error.message.includes('JWT')) {
        setShowCreateAccountDialog(true);
        setPendingPost(form.getValues());
      } else {
        toast({ 
          title: 'Error', 
          description: error.message, 
          variant: 'destructive' 
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Success', description: 'Post updated successfully' });
      setIsOpen(false);
      setSelectedPost(null);
      form.reset();
    },
    onError: (error: Error) => {
      console.error('Update mutation error:', error);
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Success', description: 'Post deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = async (data: Post) => {
    if (!user) return;
    
    try {
      if (user.isAnonymous) {
        setShowCreateAccountDialog(true);
        setPendingPost(data);
        return;
      }
      
      const postData = { 
        ...data, 
        user_id: user.id,
        // Include the ID if we're updating
        ...(selectedPost && { id: selectedPost.id })
      };

      console.log('Submitting post data:', postData);
      
      if (selectedPost) {
        await updateMutation.mutateAsync(postData);
      } else {
        await createMutation.mutateAsync(postData);
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (post: Post) => {
    console.log('Editing post:', post);
    setSelectedPost(post);
    form.reset({
      id: post.id,
      title: post.title,
      body: post.body,
      user_id: post.user_id
    });
    setIsOpen(true);
  };

  const handleCreateAccount = () => {
    localStorage.removeItem('anonymousUser');
    setUser(null);
    setShowCreateAccountDialog(false);
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-lg bg-card p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-destructive">Supabase Not Configured</h2>
          <p className="mt-2 text-muted-foreground">
            Please connect to Supabase using the "Connect to Supabase" button in the top right corner.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 
              onClick={handleTitleClick}
              className="text-4xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
            >
              Posts {user.isAnonymous && <span className="text-sm font-normal text-muted-foreground">(Guest Mode)</span>}
            </h1>
            {user.isAnonymous ? (
              <button
                onClick={handleCreateAccount}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
            ) : (
              <button 
                onClick={handleSignOut}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button 
                onClick={() => {
                  setSelectedPost(null);
                  form.reset({
                    title: '',
                    body: '',
                    user_id: user.id,
                  });
                }}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </DialogTrigger>
            <DialogContent aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle>{selectedPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
                <DialogDescription id="dialog-description">
                  {selectedPost ? 'Update your post details below.' : 'Fill in the details for your new post.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="h-32" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button 
                    type="submit" 
                    className="inline-flex w-full justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                  >
                    {selectedPost ? 'Update' : 'Create'}
                  </button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog open={showCreateAccountDialog} onOpenChange={setShowCreateAccountDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create an Account to Save Posts</AlertDialogTitle>
              <AlertDialogDescription>
                To save and manage your posts, you'll need to create an account. Would you like to create one now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowCreateAccountDialog(false);
                  setPendingPost(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreateAccount}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PostList 
          user={user}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>
    </div>
  );
}