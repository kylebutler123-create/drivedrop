'use client';
import {useState} from 'react';
import Link from 'next/link';
import Icon from './HelpPageIcon';

const topics=[
 ['quotes','file','Quotes & bookings','Request quotes, compare options and manage a booking.'],
 ['deliveries','truck','Collections & deliveries','Arrange handovers and follow delivery status.'],
 ['payments','pound','Payments & proceeds','Find booking payment and transporter proceeds information.'],
 ['account','verification','Account & verification','Manage your profile and transporter documents.'],
 ['messages','chat','Messages & contact','Keep arrangements and conversations together.'],
 ['problems','help','Changes & problems','Find guidance on changes, cancellations and booking issues.'],
];
const common=[
 {topic:'quotes',q:'How do I request transport quotes?',a:'Select Get a Quote, enter the collection, delivery and vehicle details, and create a customer account or log in to submit your request. Compare quotes sent by independent transporters before choosing.'},
 {topic:'deliveries',q:'Where can I see my booking?',a:'Log in to your account. Customers can find booked journeys under Your deliveries, and transporters can find their booked work under Active deliveries. Open the relevant booking to view details and available actions.'},
 {topic:'messages',q:'How do I contact my transporter?',a:'Open the booking under Your deliveries and use Message transporter. Call transporter is available when a contact number is on record.'},
 {topic:'problems',q:'What if there is a problem with a delivery?',a:'Open the relevant booking and use its report-a-problem controls where available. Include clear details and any supporting evidence. Review the vehicle and delivery report before confirming receipt.'},
];
const extra=[
 {topic:'payments',q:'Where can I find payment and refund information?',a:'Open Your deliveries to see the payment details for your booking. Any issued refund is shown on the booking. Use the booking’s report-a-problem controls if you need help with a delivery.'},
 {topic:'payments',q:'Where can transporters check their proceeds?',a:'Open Booked proceeds in your transporter account to review booked amounts, jobs awaiting customer confirmation, amounts ready for release and paid amounts. Check each booking for any holds, fines or refunds.'},
 {topic:'account',q:'How do I manage my account and documents?',a:'Log in to your account to manage your profile. Transporters can use the verification section to submit their driving licence and insurance documents and upload replacement insurance. Keep contact and insurance details up to date.'},
 {topic:'problems',q:'Where can I find cancellation or change options?',a:'Open the relevant request or booking in your account to see the actions available for its current status. Discuss collection or delivery arrangements through the booking conversation. Review any displayed charges and conditions before cancelling.'},
];
function classify(q:string){if(/verification|account|document/i.test(q))return 'account';if(/problem|cancel|change/i.test(q))return 'problems';if(/contact|message/i.test(q))return 'messages';if(/progress|delivered|delivery/i.test(q))return 'deliveries';return 'quotes';}
export default function HelpDesktop({questions}:{questions:readonly (readonly [string,string])[]}){
 const [input,setInput]=useState('');const [query,setQuery]=useState('');const [topic,setTopic]=useState('');
 const existing=questions.filter(([q])=>!common.some(item=>item.q===q)).map(([q,a])=>({q,a,topic:classify(q)}));
 const all=[...common,...extra,...existing];
 const filtered=query||topic?all.filter(item=>(!topic||item.topic===topic)&&(!query||(item.q+' '+item.a+' '+topics.find(t=>t[0]===item.topic)?.[2]).toLowerCase().includes(query.toLowerCase()))):common;
 function scrollAnswers(){document.getElementById('help-desktop-answers')?.scrollIntoView({behavior:'smooth',block:'start'});}
 function reset(){setInput('');setQuery('');setTopic('');}
 return <div className="approvedPublicContent approvedPublic-help helpDesktop">
 <section className="approvedPublicHero helpPageHero"><div className="approvedPageWidth"><span className="approvedEyebrow">HELP &amp; SUPPORT</span><h1>How can we help?</h1><p>Find guidance on quotes, bookings, payments and your account.</p><form className="helpPageSearch" role="search" onSubmit={e=>{e.preventDefault();setQuery(input.trim());setTopic('');scrollAnswers();}}><Icon name="search"/><input aria-label="Search help topics" value={input} onChange={e=>setInput(e.target.value)} placeholder="Search help topics…"/><button className="btn orange" type="submit">Search</button></form></div></section>
 <section className="helpBookingStrip"><div className="approvedPageWidth"><div><h2>Already have a booking?</h2><p>Open your account for messages, delivery details and problem-reporting controls.</p></div><div className="helpPageActions"><Link className="btn light" href="/login?account=customer"><Icon name="user"/>Customer login</Link><Link className="btn light" href="/login?account=transporter"><Icon name="truck"/>Transporter login</Link></div></div></section>
 <section className="approvedPageWidth helpPageTopics"><h2>Browse help by topic</h2><div>{topics.map(([key,icon,title,copy])=><button type="button" key={key} aria-pressed={topic===key} onClick={()=>{setTopic(key);setQuery('');setInput('');scrollAnswers();}}><Icon name={icon}/><span><strong>{title}</strong><span>{copy}</span></span><Icon name="arrow"/></button>)}</div></section>
 <section className="helpPageFaq" id="help-desktop-answers"><div className="approvedPageWidth"><div className="helpPageFaqHeading"><div><h2>{query?'Search results':topic?topics.find(t=>t[0]===topic)?.[2]:'Frequently asked questions'}</h2><p aria-live="polite">{query||topic?filtered.length+' answer'+(filtered.length===1?'':'s')+(query?' for “'+query+'”':''):'Start with these common questions.'}</p></div>{(query||topic)&&<button className="btn light" type="button" onClick={reset}>Show all topics</button>}</div><div className="helpPageFaqGrid">{filtered.map(({q,a})=><details key={q}><summary>{q}<span className="helpPageChevron"><Icon name="chevron"/></span></summary><p>{a}</p></details>)}</div>{!filtered.length&&<p className="helpPageNoResults">No matching answers. Try another search or open your account for help with a booking.</p>}</div></section>
 <section className="approvedPageWidth helpPageAccounts"><h2>Get help for your account</h2><div className="helpPageAccountGrid"><article><Icon name="user"/><div><h3>Customer help</h3><p>Open your account to review quotes, manage deliveries and contact your transporter.</p></div><Link className="btn orange" href="/login?account=customer">Customer login</Link></article><article><Icon name="truck"/><div><h3>Transporter help</h3><p>Open your account to manage jobs, customer messages, verification and proceeds.</p></div><Link className="btn light" href="/login?account=transporter">Transporter login</Link></article></div><p className="helpPageNote"><Icon name="info"/>For a booking issue, use the controls on the relevant booking and include clear details and any supporting evidence.</p></section>
 <section className="helpPageFinal"><div className="approvedPageWidth"><div><h2>Need general guidance?</h2><p>Find out how DriveDrop works or get in touch.</p></div><div className="helpPageActions"><Link className="btn light" href="/how-it-works">How it works</Link><Link className="btn orange" href="/contact">Contact us</Link></div></div></section>
 </div>
}
