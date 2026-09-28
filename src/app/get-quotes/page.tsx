import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import QuoteRequestWorkspace from '@/app/components/QuoteRequestWorkspace';

export const metadata = {title: 'Get Vehicle Transport Quotes | DriveDrop'};
export default async function GetQuotesPage() {
  const user = await currentUser();
  // Existing customers use their existing dashboard form, not another account registration.
  if (user?.role === 'CUSTOMER') redirect('/customer');
  return <QuoteRequestWorkspace/>;
}
