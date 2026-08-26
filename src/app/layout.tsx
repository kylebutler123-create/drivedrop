import './globals.css';
import Link from 'next/link';

export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="top">
      <Link href="/" className="logo">Drive<span>Drop</span></Link>
      <nav className="nav">
        <Link href="/customer">Customer</Link>
        <Link href="/transporter">Transporter</Link>
        <Link href="/login?account=customer">Customer login</Link>
        <Link className="btn orange" href="/login?account=transporter">Transporter login</Link>
      </nav>
    </header>
    {children}
  </body></html>;
}
