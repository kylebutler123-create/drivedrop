import Link from 'next/link';

export default function Home(){
  return <main className="shell">
    <section className="hero">
      <h1>Move Your Vehicle. Simply.</h1>
      <p>DriveDrop connects customers with trusted vehicle transporters across the UK. Request transport, receive quotes, choose a transporter and manage the booking in one place.</p>
      <Link className="btn orange" href="/register">Get transport quotes</Link>{' '}
      <Link className="btn light" href="/register?account=transporter">Join as a transporter</Link>
    </section>
    <div className="grid">
      <div className="card"><h3>🚗 Customers</h3><p className="muted">Create transport jobs and compare quotes.</p><Link href="/login?account=customer">Customer login</Link></div>
      <div className="card"><h3>🚛 Transporters</h3><p className="muted">Find available jobs, submit prices and manage verification.</p><Link href="/login?account=transporter">Transporter login</Link></div>
      <div className="card"><h3>🛠 DriveDrop</h3><p className="muted">Bookings are created with the agreed price locked.</p></div>
    </div>
  </main>;
}
