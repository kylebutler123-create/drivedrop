import Link from 'next/link';

export default function Home() {
  return (
    <main className="home">
      <section className="marketHero">
        <div className="heroInner">
          <div className="heroCopy">
            <div className="eyebrow">UK VEHICLE TRANSPORT MARKETPLACE</div>
            <h1>Move your vehicle.<br /><span>Without the hassle.</span></h1>
            <p>Tell us what needs moving and where it needs to go. Transporters compete for your job so you can compare quotes and choose with confidence.</p>
            <div className="heroActions">
              <Link className="btn orange btnLarge" href="/register">Get transport quotes</Link>
              <Link className="textLink" href="/login">Already have an account? Sign in →</Link>
            </div>
            <div className="trustRow">
              <span>✓ No obligation</span><span>✓ Compare quotes</span><span>✓ UK-wide coverage</span>
            </div>
          </div>

          <div className="quotePanel">
            <div className="quotePanelTop"><span className="quoteIcon">↗</span><div><strong>Get a transport quote</strong><small>Start your request in under 2 minutes</small></div></div>
            <div className="routePreview">
              <div className="routePoint"><i className="dot dotOrange" /><div><small>COLLECTION</small><b>Where is the vehicle?</b></div></div>
              <div className="routeLine" />
              <div className="routePoint"><i className="dot dotNavy" /><div><small>DELIVERY</small><b>Where is it going?</b></div></div>
            </div>
            <div className="vehiclePreview"><span className="vehicleIcon">🚘</span><div><small>VEHICLE</small><b>Car, van, classic or non-runner</b></div></div>
            <Link className="btn orange quoteButton" href="/register">Request quotes →</Link>
            <p className="panelNote">Free to request • No commitment</p>
          </div>
        </div>
      </section>

      <section className="proofBar">
        <div><strong>Simple</strong><span>One request, multiple quotes</span></div>
        <div><strong>Competitive</strong><span>Transporters bid for your job</span></div>
        <div><strong>Secure</strong><span>Booking details in one place</span></div>
        <div><strong>Nationwide</strong><span>Vehicle moves across the UK</span></div>
      </section>

      <section className="section how">
        <div className="sectionHeading"><span>HOW IT WORKS</span><h2>Vehicle transport made straightforward</h2><p>From first request to final delivery, DriveDrop keeps the process clear.</p></div>
        <div className="steps">
          <article><em>01</em><div className="stepIcon">⌖</div><h3>Tell us the journey</h3><p>Add collection, delivery and vehicle details to create your transport request.</p></article>
          <article><em>02</em><div className="stepIcon">£</div><h3>Compare transporter quotes</h3><p>Receive prices from transporters and choose the option that works for you.</p></article>
          <article><em>03</em><div className="stepIcon">✓</div><h3>Book and manage the job</h3><p>Confirm the agreed price and manage your booking from your DriveDrop account.</p></article>
        </div>
      </section>

      <section className="splitSection">
        <div className="splitCard customerCard">
          <span className="pill">FOR CUSTOMERS</span><h2>A better way to move a vehicle</h2>
          <p>Whether you bought a car online, sold one privately or need a non-runner collected, DriveDrop helps you find the right transporter.</p>
          <ul><li>Compare quotes in one place</li><li>Choose the transporter that suits you</li><li>Keep job and booking details organised</li></ul>
          <Link className="btn navy" href="/register">Request transport</Link>
        </div>
        <div className="splitCard transporterCard">
          <span className="pill darkPill">FOR TRANSPORTERS</span><h2>Turn empty miles into paid work</h2>
          <p>Find available vehicle movements, submit competitive quotes and build a stronger pipeline of transport jobs.</p>
          <ul><li>Browse available jobs</li><li>Quote directly for suitable work</li><li>Manage bookings from one dashboard</li></ul>
          <Link className="btn light" href="/register">Join as a transporter</Link>
        </div>
      </section>

      <section className="ctaBand">
        <div><span>READY TO GET MOVING?</span><h2>Get your vehicle transport quotes today.</h2></div>
        <Link className="btn orange btnLarge" href="/register">Start a free request →</Link>
      </section>
    </main>
  );
}
