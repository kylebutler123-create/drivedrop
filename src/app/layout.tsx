import './globals.css';
import './home-hero.css';
import './mobile-polish.css';
import './dashboard-polish.css';
import './account-edit.css';
import './requote.css';
import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import MessagesNavLink from '@/app/components/MessagesNavLink';
import NotificationNavLink from '@/app/components/NotificationNavLink';
import CustomerQuoteRequestNavigator from '@/app/components/CustomerQuoteRequestNavigator';
import AgreedCollectionDateEnhancer from '@/app/components/AgreedCollectionDateEnhancer';
import TransporterRequoteEnhancer from '@/app/components/TransporterRequoteEnhancer';

export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};

export default async function Layout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  const dashboardHref=user?.role==='CUSTOMER'?'/customer':user?.role==='TRANSPORTER'?'/transporter':user?.role==='ADMIN'?'/admin':'/login';
  const reviewHref=user?.role==='TRANSPORTER'?'/transporter/reviews':user?.role==='ADMIN'?'/admin/review-disputes':null;
  const reviewLabel=user?.role==='TRANSPORTER'?'Customer reviews':user?.role==='ADMIN'?'Review moderation':null;

  return <html lang="en"><body>
    <CustomerQuoteRequestNavigator/>
    <AgreedCollectionDateEnhancer/>
    <TransporterRequoteEnhancer/>
    <header className={`top${user?.role==='TRANSPORTER'?' transporterTop':user?.role==='CUSTOMER'?' customerTop':!user?' guestTop':''}`}>
      {user?.role==='CUSTOMER'?<div className="customerPrimaryNav">
        <Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><img src="/AC51EBEA-9552-47BB-92A0-E8D611539A71.png" alt="DriveDrop" /></Link>
        <Link className="btn light accountNavBtn" href="/account">Account</Link>
        <Link className="btn orange customerDashboardBtn" href={dashboardHref}>Dashboard</Link>
        <form action="/api/auth/logout" method="post"><button className="btn light" type="submit">Sign out</button></form>
      </div>:!user?<div className="guestPrimaryNav">
        <Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><img src="/AC51EBEA-9552-47BB-92A0-E8D611539A71.png" alt="DriveDrop" /></Link>
        <Link className="btn light" href="/login?account=customer">Customer login</Link>
        <Link className="btn orange" href="/login?account=transporter">Transporter login</Link>
      </div>:<Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><img src="/AC51EBEA-9552-47BB-92A0-E8D611539A71.png" alt="DriveDrop" /></Link>}
      <nav className="nav">
        {user?<>
          {user.role==='TRANSPORTER'?<>
            <span className="transporterCommsNav">
              <MessagesNavLink/>
              <NotificationNavLink/>
              <Link className="btn orange transporterDashboardBtn" href={dashboardHref}>Dashboard</Link>
            </span>
            <span className="transporterManageNav">
              <Link href="/transporter/manage-deliveries">Manage deliveries</Link>
              <Link href="/transporter/quotes">My quotes</Link>
              <Link href="/transporter/reviews">Customer reviews</Link>
            </span>
            <Link className="btn light accountNavBtn" href="/account">Account</Link>
            <form action="/api/auth/logout" method="post"><button className="btn light" type="submit">Sign out</button></form>
          </>:user.role==='CUSTOMER'?<>
            <span className="customerSecondaryNav">
              <Link href="/customer/manage-requests">Manage requests</Link>
              <MessagesNavLink/>
              <NotificationNavLink/>
            </span>
          </>:<>
            <NotificationNavLink/>
            {reviewHref&&reviewLabel&&<Link href={reviewHref}>{reviewLabel}</Link>}
            <Link className="btn light accountNavBtn" href="/account">Account</Link>
            <Link className="btn orange" href={dashboardHref}>Dashboard</Link>
            <form action="/api/auth/logout" method="post"><button className="btn light" type="submit">Sign out</button></form>
          </>}
        </>:null}
      </nav>
    </header>
    {children}
  </body></html>;
}
