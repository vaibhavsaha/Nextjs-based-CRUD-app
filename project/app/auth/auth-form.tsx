'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn, signUp, createAnonymousUser } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      if (isSignUp) {
        const response = await signUp(data.email, data.password);
        console.log('Signup response:', response);
        
        if (response.user) {
          setSignUpSuccess(true);
          toast({
            title: 'Account created',
            description: 'Please check your email to verify your account.',
          });
        }
      } else {
        const response = await signIn(data.email, data.password);
        if (response.user) {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in',
          });
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.';
        } else if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    const anonymousUser = createAnonymousUser();
    localStorage.setItem('anonymousUser', JSON.stringify(anonymousUser));
    window.location.href = '/';
  };

  if (!mounted) {
    return null;
  }

  if (signUpSuccess) {
    return (
      <div className="auth-card">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-600">
            We've sent a confirmation link to your email address. Please check your inbox (and spam folder) to verify your account.
          </p>
          <button
            className="auth-button"
            onClick={() => {
              setSignUpSuccess(false);
              setIsSignUp(false);
              form.reset();
            }}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2 className="text-3xl font-bold text-center text-[#4299e1] mb-8">
        {isSignUp ? 'Create an Account' : 'Sign In'}
      </h2>
      
      {authError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{authError}</span>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Email</FormLabel>
                <FormControl>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="auth-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Password</FormLabel>
                <FormControl>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="auth-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
          <div className="space-y-4">
            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : isSignUp ? (
                'Sign Up'
              ) : (
                'Sign In'
              )}
            </button>
            <button
              type="button"
              className="w-full text-[#4299e1] hover:text-[#3182ce] font-medium transition-colors"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
                form.reset();
              }}
              disabled={isLoading}
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
            <div className="auth-divider">or</div>
            <button
              type="button"
              className="w-full px-4 py-2 border-2 border-[#4299e1] text-[#4299e1] rounded-xl font-medium hover:bg-[#4299e1] hover:text-white transition-all duration-200"
              onClick={handleSkip}
            >
              Continue as Guest
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}