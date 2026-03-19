import { redirect } from 'next/navigation';

export default async function Page() {
  // Redirect to the dashboard
  return redirect('/dashboard');
}
