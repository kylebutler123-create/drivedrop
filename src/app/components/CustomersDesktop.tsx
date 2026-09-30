import Link from 'next/link';
import Icon from './ApprovedIcon';

const reasons=[
 ['car','Bought a vehicle?','Arrange collection from a seller or dealership.'],
 ['globe','Moving home?','Plan vehicle delivery around your relocation.'],
 ['hand','Selling a vehicle?','Coordinate delivery with your buyer.'],
 ['settings','Special transport needs?','Share non-running conditions or loading requirements.'],
];
const steps=[
 ['file','Share the details','Add the route, vehicle, date and transport type so transporters can quote for your journey.'],
 ['search','Compare more than price','Review profiles, feedback and proposed dates. Ask questions before choosing.'],
 ['hand','Agree the arrangements','Confirm access, loading requirements and collection times with your chosen transporter.'],
];
const questions=[
 ['Do I need an account?','Create a customer account or log in to send your request and manage your quotes, messages and bookings.'],
 ['Can I transport a non-running vehicle?','Yes. Select non-running in your request and explain any faults or loading requirements. Confirm that your chosen transporter has suitable equipment before booking.'],
 ['Which transport type should I choose?','Choose Driven for a driven delivery, Open transport for an open carrier, or Enclosed transport for a covered carrier. Choose Any if you have no preference. Enclosed transport is available for cars, motorcycles and classic / prestige vehicles. Discuss suitability with your transporter.'],
 ['What happens after I accept a quote?','Complete the booking payment, then contact your transporter to agree collection and handover arrangements. Follow status updates in your account. At delivery, inspect the vehicle and review the handover report before confirming receipt; use the booking’s report-a-problem controls if needed.'],
];
export default function CustomersDesktop(){return <div className="approvedPublicContent approvedPublic-for-customers customerDesktop">
 <section className="approvedPublicHero customerHero"><div className="approvedPageWidth"><span className="approvedEyebrow">FOR CUSTOMERS</span><h1>Vehicle transport,<br/><span>built around you.</span></h1><p>Buying, selling or relocating? Compare independent transporters and manage your vehicle delivery in one place.</p><div className="customerHeroActions"><Link className="btn orange" href="/get-quotes">Get transport quotes <Icon name="arrow"/></Link><Link className="btn light" href="/how-it-works">How it works</Link></div></div></section>
 <section className="customerBenefits"><div className="approvedPageWidth">{[['file','One request, multiple quotes','Tell us what you need and receive quotes from independent transporters.'],['user','Choose your transporter','Compare profiles, feedback and proposed dates.'],['grid','Manage your booking','Keep everything in one place from quote to delivery.']].map(([icon,title,copy])=><article key={title}><Icon name={icon}/><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div></section>
 <section className="approvedPageWidth customerReasons"><h2>Whatever the reason for your move.</h2><p>Cars, motorcycles, vans and more. Tell us what you need moved.</p><div>{reasons.map(([icon,title,copy])=><article key={title}><Icon name={icon}/><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
 <section className="customerCompare"><div className="approvedPageWidth"><h2>Choose a quote with confidence.</h2><div className="customerCompareGrid">{steps.map(([icon,title,copy],i)=><article key={title}><span className="customerNumber">{i+1}</span><Icon name={icon}/><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div></section>
 <section className="approvedPageWidth customerDetails"><img src="/orange-design-preview/assets/customers-bmw-handover.webp" alt="Customer and delivery driver beside a newly delivered blue BMW SUV" width={1536} height={1024}/><div className="customerAccount"><span className="approvedEyebrow">YOUR CUSTOMER ACCOUNT</span><h2>Every detail. In one place.</h2><p>Keep your delivery organised from your account.</p><ul>{['Compare and manage quotes','Message your transporter and follow status updates','Review handover reports and confirm delivery'].map(line=><li key={line}><Icon name="check"/>{line}</li>)}</ul><Link className="btn orange" href="/customer">Explore your account <Icon name="arrow"/></Link></div><div className="customerChecklist"><h2>Before you request quotes</h2><p>Having a few details ready will help transporters quote for your journey.</p><ul>{['Collection and delivery postcodes','Vehicle type, make and model','Preferred date and transport type','Running condition and access details'].map(line=><li key={line}><Icon name="check"/>{line}</li>)}</ul></div></section>
 <section className="approvedPageWidth customerFaq"><h2>Questions customers ask</h2><div>{questions.map(([question,answer],i)=><details key={question} open={i===0}><summary>{question}<span aria-hidden="true">⌄</span></summary><p>{answer}</p></details>)}</div></section>
 <section className="customerFinalCta"><div className="approvedPageWidth"><h2>Ready to arrange your vehicle delivery?</h2><Link className="btn orange" href="/get-quotes">Get transport quotes <Icon name="arrow"/></Link></div></section>
 </div>}
