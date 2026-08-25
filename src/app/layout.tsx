import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'DriveDrop | UK Vehicle Transport Marketplace',
  description: 'Compare quotes from vehicle transporters across the UK with DriveDrop.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="logo">Drive<span>Drop</span></Link>
          <nav className="nav">
            <Link href="/customer">For customers</Link>
            <Link href="/transporter">For transporters</Link>
            <Link href="/login">Log in</Link>
            <Link className="btn orange navCta" href="/register">Get quotes</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
