'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { AuthHeader } from '@/components/auth-header';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLayoutLogoData } from '../../layout-logo-context';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, {
      message: 'Password must be at least 8 characters.',
    }),
    confirmPassword: z.string().min(8, {
      message: 'Password must be at least 8 characters.',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords don&apos;t match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const logoData = useLayoutLogoData();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const errorFromUrl = searchParams.get('error');

    if (errorFromUrl === 'INVALID_TOKEN') {
      setHasError(true);
      toast.error('Invalid or expired reset token');
    } else if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setHasError(true);
    }
  }, [searchParams]);

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    setIsSubmitting(true);
    const { newPassword } = values;

    const { data, error } = await resetPassword(
      {
        newPassword: newPassword,
        token: token,
      },
      {
        onRequest: () => {
          toast.loading('Resetting password...');
        },
        onSuccess: () => {
          toast.dismiss();
          toast.success('Password reset successfully!');
          setPasswordReset(true);
        },
        onError: (ctx) => {
          toast.dismiss();
          toast.error(ctx.error.message || 'Failed to reset password');
        },
      },
    );

    setIsSubmitting(false);
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <AuthHeader logoData={logoData} showWelcomeMessage={false} />

          <Card className="mt-6">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Invalid Reset Link
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                This password reset link is invalid or has expired.
              </p>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Password reset links expire after a certain time for security
                reasons. Please request a new one.
              </p>
              <div className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href="/forgot-password">Request New Reset Link</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signin">Back to Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <AuthHeader logoData={logoData} showWelcomeMessage={false} />

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Password Reset Successful
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your password has been successfully reset. You can now sign in
                with your new password.
              </p>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <Button className="w-full" asChild>
                <Link href="/signin">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthHeader logoData={logoData} showWelcomeMessage={false} />

        <Card>
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Reset Your Password
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your new password below.
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signin">Back to Sign In</Link>
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p>
              Remember your password?{' '}
              <Link href="/signin" className="text-blue-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
