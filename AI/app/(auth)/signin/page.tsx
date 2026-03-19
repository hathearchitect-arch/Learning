'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { signIn, sendVerificationEmail } from '@/lib/auth-client';
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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLayoutLogoData } from '../../layout-logo-context';

const signinSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(8, {
    message: 'Password must be at least 8 characters.',
  }),
});

export default function SignInPage() {
  const router = useRouter();
  const logoData = useLayoutLogoData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof signinSchema>) {
    setIsSubmitting(true);
    const { email, password } = values;
    const { data, error } = await signIn.email(
      {
        email: email,
        password: password,
        callbackURL: '/home',
        rememberMe: false,
      },
      {
        onRequest: () => {
          toast.loading('Signing in...');
        },
        onSuccess: () => {
          toast.dismiss();
          toast.success('Sign in successful!');
        },
        onError: (ctx) => {
          toast.dismiss();
          // Handle the error
          if (ctx.error.status === 403) {
            toast.error('Please verify your email address');
            setShowResendDialog(true);
          } else if (ctx.error.code === 'INVALID_EMAIL_OR_PASSWORD') {
            toast.error('Invalid email or password');
          }
        },
      },
    );
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resend Verification Email?</DialogTitle>
              <DialogDescription>
                Verify your email address before signing in.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowResendDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await sendVerificationEmail({
                    email: form.getValues('email'),
                  });
                  toast.success('Verification email sent!');
                  setShowResendDialog(false);
                  router.push('/confirm-signup');
                }}
              >
                Resend Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AuthHeader logoData={logoData} showWelcomeMessage={true} />

        <Card className="mt-6">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Sign In to Your Account
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please enter your email and password to continue.
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
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
                  Sign In
                </Button>
                <Button variant={'outline'} className="w-full" asChild>
                  <Link href="/signup">Create an Account</Link>
                </Button>
                <div className="mt-4 text-center space-y-2">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground">
              By signing in, you agree to our{' '}
              <Link href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
