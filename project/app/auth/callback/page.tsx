'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  // Extract 'code' safely
  const code = useMemo(() => searchParams.get('code'), [searchParams]);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setError('No confirmation code found');
      return;
    }

    const handleCallback = async () => {
      try {
        const { data, error: signInError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (signInError) {
          throw signInError;
        }

        if (data.session) {
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/'; // Full page reload to refresh session
          }, 2000);
        } else {
          throw new Error('No session created');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setError((err as Error).message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,118,255,0.9)] dark:shadow-[0_20px_60px_-15px_rgba(66,153,225,0.9)] dark:bg-gray-800 transform transition-all duration-300">
        <div className="text-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="relative mx-auto w-16 h-16">
                <Loader2 className="absolute inset-0 w-16 h-16 text-blue-500 animate-spin" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                Verifying your email
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we complete the verification process...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400">
                Email verified!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your email has been verified successfully. Redirecting you to the homepage...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">
                Verification failed
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {error || 'An error occurred during verification.'}
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transform transition-all duration-200 hover:scale-[1.02]"
              >
                Return to Homepage
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
