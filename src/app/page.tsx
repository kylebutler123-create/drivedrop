import Link from 'next/link';

const steps = [
  ['1','Tell us about your vehicle'],
  ['2','Receive quotes from transporters'],
  ['3','Choose your transporter'],
  ['4','Pay your deposit'],
  ['5','Track your vehicle'],
  ['6','Vehicle delivered'],
];

export default function Home(){
  return <main className="dd-home">
    <section className="dd-hero">
      <div className="dd-hero-overlay" />
      <div className="dd-hero-content">
        <p className="dd-kicker">UK VEHICLE TRANSPORT MARKETPLACE</p>
        <h1>Move Your Vehicle.<br/><span>Simply.</span></h1>
        <p className="dd-hero-copy">Get competitive quotes from trusted vehicle transporters across the UK.</p>
        <div className="dd-hero-actions">
          <Link className="btn orange" href="/register">Get a Quote</Link>
          <Link className="btn outline-light" href="/login">Transporter Login</Link>
        </div>
      </div>
    </section>

    <section className="dd-trustbar">
      <div><b>✓</b><span><strong>Trusted Transporters</strong><small>Verified & rated</small></span></div>
      <div><b>£</b><span><strong>Competitive Prices</strong><small>Multiple quotes</small></span></div>
      <div><b>⌖</b><span><strong>UK Wide Coverage</strong><small>Nationwide service</small></span></div>
      <div><b>▣</b><span><strong>Secure Payments</strong><small>Deposits & balance</small></span></div>
    </section>

    <section className="dd-how shell">
      <h2>How DriveDrop Works</h2>
      <div className="dd-steps">
        {steps.map(([n,label]) => <div className="dd-step" key={n}><div className="dd-step-icon">{n}</div><strong>{n}</strong><p>{label}</p></div>)}
      </div>
    </section>

    <section className="dd-safety shell">
      <div className="dd-safety-photo" />
      <div className="dd-safety-copy">
        <p className="dd-kicker">DRIVEDROP</p>
        <h2>Safe. Reliable. Professional.</h2>
        <p>Whether it’s a family car, a classic, a van or a motorbike, DriveDrop connects you with trusted transporters across the UK.</p>
        <Link className="btn orange" href="/register">Get Started Today</Link>
      </div>
    </section>
  </main>
}
