import {redirect,notFound} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {customerPayments} from '@/lib/customer-payment-data';
import PaymentsView from './PaymentsView';
export const dynamic='force-dynamic';
export default async function PaymentsPage(){
  const user=await currentUser();
  if(!user)redirect('/login');
  if(user.role!=='CUSTOMER')notFound();
  return <PaymentsView payments={await customerPayments(user.id)}/>;
}
