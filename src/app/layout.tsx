import './globals.css';
import './home-hero.css';
import './mobile-polish.css';
import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import MessagesNavLink from '@/app/components/MessagesNavLink';
import NotificationNavLink from '@/app/components/NotificationNavLink';
import CustomerQuoteRequestNavigator from '@/app/components/CustomerQuoteRequestNavigator';

export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};

export default async function Layout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  const dashboardHref=user?.role==='CUSTOMER'?'/customer':user?.role==='TRANSPORTER'?'/transporter':user?.role==='ADMIN'?'/admin':'/login';
  const manageHref=user?.role==='CUSTOMER'?'/customer/manage-requests':user?.role==='TRANSPORTER'?'/transporter/manage-deliveries':null;
  const manageLabel=user?.role==='CUSTOMER'?'Manage requests':user?.role==='TRANSPORTER'?'Manage deliveries':null;
  const reviewHref=user?.role==='TRANSPORTER'?'/transporter/reviews':user?.role==='ADMIN'?'/admin/review-disputes':null;
  const reviewLabel=user?.role==='TRANSPORTER'?'Customer reviews':user?.role==='ADMIN'?'Review moderation':null;
  const showMessages=user&&user.role!=='ADMIN';

  return <html lang="en"><body>
    <CustomerQuoteRequestNavigator/>
    <header className="top">
      <Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><img src="/AC51EBEA-9552-47BB-92A0-E8D611539A71.png" alt="DriveDrop" /></Link>
      <nav className="nav">
        {user?<>
          {manageHref&&manageLabel&&<Link href={manageHref}>{manageLabel}</Link>}
          {showMessages&&<MessagesNavLink/>}
          <NotificationNavLink/>
          {reviewHref&&reviewLabel&&<Link href={reviewHref}>{reviewLabel}</Link>}
          <Link className="btn orange" href={dashboardHref}>Dashboard</Link>
          <form action="/api/auth/logout" method="post"><button className="btn light" type="submit">Sign out</button></form>
        </>:<>
          <Link href="/login?account=customer">Customer login</Link>
          <Link className="btn orange" href="/login?account=transporter">Transporter login</Link>
        </>}
      </nav>
    </header>
    {children}
  </body></html>;
}
