import {publicPageMetadata} from '@/lib/seo';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import QuoteRequestWorkspace from '@/app/components/QuoteRequestWorkspace';

export const metadata = publicPageMetadata('/get-quotes');
export default async function GetQuotesPage() {
  const user = await currentUser();
  // Existing customers use their existing dashboard form, not another account registration.
  if (user?.role === 'CUSTOMER') redirect('/customer');
  return <QuoteRequestWorkspace/>;
}
