import Link from 'next/link';

const recent=[
  {vehicle:'BMW 3 Series',from:'Manchester, M1',to:'Bristol, BS1',price:'£210'},
  {vehicle:'Ford Transit',from:'Leeds, LS1',to:'London, E16',price:'£295'},
  {vehicle:'Porsche 911',from:'Birmingham, B1',to:'Edinburgh, EH1',price:'£465'},
];

export default function Home(){
  return <main>
    <section className="marketHero">
      <div className="marketHeroInner">
        <div className="marketHeroCopy">
          <span className="eyebrow">UK vehicle transport marketplace</span>
          <h1>Get vehicle transport quotes in minutes</h1>
          <p>Tell us what you need moved. Verified transporters compete for your job, so you can compare prices, profiles and reviews before you book.</p>
          <div className="trustLine"><span>✓ Free to request quotes</span><span>✓ No obligation</span><span>✓ UK-wide transporters</span></div>
        </div>

        <div className="quotePanel">
          <div className="quotePanelHeader"><strong>What vehicle are you moving?</strong><span>Takes about 60 seconds</span></div>
          <form action="/register" className="quoteForm">
            <label>VEHICLE TYPE</label>
            <select name="vehicleType" defaultValue="CAR"><option value="CAR">Car</option><option value="VAN">Van</option><option value="MOTORCYCLE">Motorcycle</option><option value="CLASSIC">Classic / prestige vehicle</option><option value="OTHER">Other vehicle</option></select>
            <div className="quoteGrid">
              <div><label>COLLECTION POSTCODE</label><input name="collection" placeholder="e.g. M1 1AA" /></div>
              <div><label>DELIVERY POSTCODE</label><input name="delivery" placeholder="e.g. BS1 1AA" /></div>
            </div>
            <button className="btn orange quoteCta">Get My Quotes</button>
            <p className="quoteSmall">No payment required to request quotes.</p>
          </form>
        </div>
      </div>
    </section>

    <section className="proofStrip">
      <div><strong>Fast & easy</strong><span>One simple vehicle transport request</span></div>
      <div><strong>Trusted transporters</strong><span>Profiles, verification and customer feedback</span></div>
      <div><strong>Competitive quotes</strong><span>Transporters compete for your job</span></div>
      <div><strong>DriveDrop support</strong><span>A UK-focused marketplace built for vehicles</span></div>
    </section>

    <section className="sectionWrap centered">
      <span className="eyebrow dark">Simple, transparent transport</span>
      <h2>How DriveDrop works</h2>
      <p className="sectionLead">A straightforward marketplace journey from quote request to completed delivery.</p>
      <div className="stepsGrid">
        <article className="stepCard"><div className="stepNo">1</div><h3>Tell us about your vehicle</h3><p>Add collection, delivery and vehicle details in one quick request.</p></article>
        <article className="stepCard"><div className="stepNo">2</div><h3>Compare transporter quotes</h3><p>Review prices, transporter profiles, verification and feedback before choosing.</p></article>
        <article className="stepCard"><div className="stepNo">3</div><h3>Book with confidence</h3><p>Choose your transporter, pay the booking deposit and manage the delivery through DriveDrop.</p></article>
      </div>
      <Link className="btn orange largeCta" href="/register">Request Vehicle Transport Quotes</Link>
    </section>

    <section className="trustSection">
      <div className="sectionWrap trustGrid">
        <div>
          <span className="eyebrow">Built around trust</span>
          <h2>Choose the right transporter, not just the cheapest quote</h2>
          <p>DriveDrop is being built specifically for vehicle movements, with transporter verification, insurance details, ratings, completed-delivery history and clear business profiles.</p>
          <ul className="checkList"><li>DriveDrop Verified status</li><li>Insurance and business checks</li><li>Customer reviews and ratings</li><li>Vehicle specialisms and coverage areas</li></ul>
        </div>
        <div className="verifiedCard">
          <div className="verifiedTop"><div className="avatarTruck">🚛</div><div><strong>Northline Vehicle Transport</strong><span>DriveDrop Verified</span></div></div>
          <div className="rating">★★★★★ <b>4.9</b></div>
          <div className="verifiedStats"><div><b>248</b><span>Deliveries</span></div><div><b>11 yrs</b><span>Operating</span></div><div><b>UK-wide</b><span>Coverage</span></div></div>
          <div className="verifiedTags"><span>Insured</span><span>Car transport</span><span>Non-runners</span></div>
        </div>
      </div>
    </section>

    <section className="sectionWrap">
      <div className="sectionHeadingRow"><div><span className="eyebrow dark">Marketplace activity</span><h2>Recent vehicle deliveries</h2></div><Link href="/register">Get quotes →</Link></div>
      <div className="recentGrid">{recent.map(x=><article className="deliveryCard" key={x.vehicle}><div className="vehicleVisual">🚗</div><h3>{x.vehicle}</h3><div className="deliveryRoute"><span>● {x.from}</span><span>↓</span><span>● {x.to}</span></div><div className="deliveryPrice"><span>Example accepted quote</span><strong>{x.price}</strong></div></article>)}</div>
    </section>

    <section className="reviewSection">
      <div className="sectionWrap centered"><span className="eyebrow dark">Customer confidence</span><h2>Designed to make vehicle transport feel simple</h2><div className="reviewGrid"><blockquote>“Clear quotes, clear transporter profiles and everything in one place.”<cite>Example customer experience</cite></blockquote><blockquote>“Being able to see verification and reviews before booking makes a huge difference.”<cite>Example customer experience</cite></blockquote><blockquote>“A much easier way to arrange a vehicle movement than ringing around transport companies.”<cite>Example customer experience</cite></blockquote></div></div>
    </section>

    <section className="transporterCta"><div className="sectionWrap transporterCtaInner"><div><span className="eyebrow">For transport companies</span><h2>Find vehicle transport jobs that fit your routes</h2><p>Create your transporter profile, complete verification and quote on suitable customer jobs.</p></div><div><Link className="btn orange largeCta" href="/register?account=transporter">Join DriveDrop as a Transporter</Link><br/><Link className="textLink" href="/login?account=transporter">Already registered? Sign in</Link></div></div></section>

    <footer className="siteFooter"><div className="sectionWrap footerGrid"><div><div className="logo footerLogo">Drive<span>Drop</span></div><p>UK vehicle transport, made simpler.</p></div><div><strong>Customers</strong><Link href="/register">Get quotes</Link><Link href="/login?account=customer">Customer login</Link></div><div><strong>Transporters</strong><Link href="/register?account=transporter">Join DriveDrop</Link><Link href="/login?account=transporter">Transporter login</Link></div><div><strong>Trust & support</strong><span>Verification</span><span>Secure booking</span><span>UK marketplace</span></div></div></footer>
  </main>;
}
