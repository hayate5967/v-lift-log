import { redirect } from 'next/navigation';
import { getToken } from '@/lib/session';

export default async function RootPage() {
  const token = await getToken();
  redirect(token ? '/feed' : '/login');
}
