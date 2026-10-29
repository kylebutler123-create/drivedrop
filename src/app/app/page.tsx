import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';

/** A stable home-screen launch URL, using the existing authenticated session. */
export default async function AppLaunch() {
  const user = await currentUser();
  redirect(user?.role === 'CUSTOMER' ? '/customer' : user?.role === 'TRANSPORTER' ? '/transporter' : user?.role === 'ADMIN' ? '/admin' : '/login');
}
