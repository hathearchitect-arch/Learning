'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/auth-client';
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
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useLayoutLogoData } from '../../layout-logo-context';

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

export default function ForgotPasswordPage() {
  const logoData = useLayoutLogoData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsSubmitting(true);
    const { email } = values;

    const { data, error } = await requestPasswordReset(
      {
        email: email,
        redirectTo: `${window.location.origin}/reset-password`,
      },
      {
        onRequest: () => {
          toast.loading('Sending reset email...');
        },
        onSuccess: () => {
          toast.dismiss();
          toast.success('Password reset email sent!');
          setEmailSent(true);
          setSentEmail(email);
        },
        onError: (ctx) => {
          toast.dismiss();
          toast.error(ctx.error.message || 'Failed to send reset email');
        },
      },
    );

    setIsSubmitting(false);
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <AuthHeader logoData={logoData} showWelcomeMessage={false} />

          <Card className="mt-6">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Check Your Email
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium">{sentEmail}</span>
              </p>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in the email to reset your password. If you
                don&apos;t see it, check your spam folder.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setSentEmail('');
                    form.reset();
                  }}
                >
                  Send to Different Email
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signin">Back to Sign In</Link>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-center">
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive the email?{' '}
                <button
                  type="button"
                  onClick={() => onSubmit({ email: sentEmail })}
                  className="text-blue-600 hover:underline"
                  disabled={isSubmitting}
                >
                  Resend
                </button>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthHeader logoData={logoData} showWelcomeMessage={false} />

        <Card className="mt-6">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Forgot Your Password?
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Email'}
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
