import './globals.css';
import './home-hero.css';
import Link from 'next/link';
import {currentUser} from '@/lib/auth';

export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};

export default async function Layout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  const dashboardHref=user?.role==='CUSTOMER'?'/customer':user?.role==='TRANSPORTER'?'/transporter':user?.role==='ADMIN'?'/admin':'/login';
  const manageHref=user?.role==='CUSTOMER'?'/customer/manage-requests':user?.role==='TRANSPORTER'?'/transporter/manage-deliveries':null;
  const manageLabel=user?.role==='CUSTOMER'?'Manage requests':user?.role==='TRANSPORTER'?'Manage deliveries':null;

  return <html lang="en"><body>
    <header className="top">
      <Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><img src="/0FC04387-3302-40FE-A7BD-EF957904F4EE.png" alt="DriveDrop" /></Link>
      <nav className="nav">
        {user?<>
          {manageHref&&manageLabel&&<Link href={manageHref}>{manageLabel}</Link>}
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
