import './globals.css';
import Link from 'next/link';
import {currentUser} from '@/lib/auth';

export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};

export default async function Layout({children}:{children:React.ReactNode}){
  const user=await currentUser();
  const dashboardHref=user?.role==='CUSTOMER'?'/customer':user?.role==='TRANSPORTER'?'/transporter':user?.role==='ADMIN'?'/admin':'/login';

  return <html lang="en"><body>
    <header className="top">
      <Link href="/" className="logo">Drive<span>Drop</span></Link>
      <nav className="nav">
        {user?<Link className="btn orange" href={dashboardHref}>Dashboard</Link>:<>
          <Link href="/login?account=customer">Customer login</Link>
          <Link className="btn orange" href="/login?account=transporter">Transporter login</Link>
        </>}
      </nav>
    </header>
    {children}
  </body></html>;
}
