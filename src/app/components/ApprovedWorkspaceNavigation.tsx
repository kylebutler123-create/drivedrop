'use client';
import Link from 'next/link';
import '../customer-overview-polish.css';
import {usePathname,useSearchParams} from 'next/navigation';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';
import CustomerAvatar from './CustomerAvatar';
const menus:Record<string,string[][]>={
 CUSTOMER:[['/customer','grid','Dashboard'],['/customer?view=request','file','Get a Quote'],['/customer?view=quotes','file','Quote requests'],['/customer?view=bookings','car','Your deliveries'],['/customer?view=completed','check','Completed'],['/customer?view=cancelled','flag','Cancelled'],['/messages','chat','Messages'],['/notifications','shield','Notifications'],['/account','settings','Account']],
 TRANSPORTER:[['/transporter','grid','Dashboard'],['/transporter?view=jobs','search','Available jobs'],['/transporter/quotes','file','My submitted quotes'],['/transporter?view=deliveries','truck','Active deliveries'],['/transporter/delivered','check','Delivered'],['/transporter/proceeds','pound','Booked proceeds'],['/transporter/verification','shield','Verification'],['/account','user','Account'],['/transporter/reviews','star','Reviews']],
 ADMIN:[['/admin','grid','Control Centre'],['/admin?action=users','user','User management'],['/admin?action=verification','shield','Transporter verification'],['/admin?action=disputes','flag','Dispute management'],['/admin?action=operations','car','Bookings & deliveries'],['/admin/payouts','pound','Payouts'],['/admin/review-disputes','star','Review moderation'],['/messages','chat','Messages'],['/notifications','shield','Notifications'],['/account','settings','Account']]
};
export default function ApprovedWorkspaceNavigation({role,name}:{role:string;name:string}){
 const pathname=usePathname();const params=useSearchParams();const key=role in menus?role:'CUSTOMER';const admin=key==='ADMIN';const publicPage=['/','/how-it-works','/for-customers','/for-transporters','/about','/help','/contact','/terms','/privacy','/get-quotes'].includes(pathname);const rail=!publicPage&&admin;const items=menus[key];
 const active=(href:string)=>{const [path,query]=href.split('?');return pathname===path&&(query?query===params.toString():!params.has('view')&&!params.has('action'))};
 const navItem=([href,icon,label]:string[])=> <a key={href} href={href} className={active(href)?'active':''} aria-current={active(href)?'page':undefined}><Icon name={icon}/><span>{label}</span></a>;
 const title=key==='CUSTOMER'?'Customer':key==='TRANSPORTER'?'Transporter':'Administrator';
 return <div className="approvedWorkspaceNav" data-role={key.toLowerCase()} data-rail={rail}>
 <header className="approvedAccountHeader"><Link className="approvedAccountBrand" href="/">{key==='CUSTOMER'&&pathname==='/customer'&&params.get('view')!=='request'?<span className="customerDashboardBrand"><svg viewBox="0 0 32 44" aria-hidden="true"><path fill="#ff6500" d="M16 1C7.7 1 1 7.7 1 16c0 11.2 15 27 15 27s15-15.8 15-27C31 7.7 24.3 1 16 1Z"/><circle cx="16" cy="16" r="8.8" fill="white"/></svg><span>DriveDrop</span></span>:<img src="/orange-design-preview/assets/logo.svg" alt="DriveDrop — Vehicle delivery, simplified"/>}</Link><nav aria-label="Desktop account navigation">{(admin?items.slice(0,1):key==='CUSTOMER'?[items[0],items[1],items[3],items[8],['/help','help','Help & support']]:[items[0],items[1],items[3],items[5],items[6]]).map(navItem)}</nav><div className="approvedAccountActions"><MessagesNavLink/><NotificationNavLink/><Link href="/account" className="approvedAccountIdentity">{key==='CUSTOMER'?<CustomerAvatar name={name}/>:<span className="approvedInitial">{name.trim().charAt(0).toUpperCase()}</span>}<span>{name}<small>{title}</small></span></Link><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sign out" title="Sign out"><Icon name="out"/></button></form></div></header>
 {rail&&<aside className="approvedRail">{admin&&<Link href="/admin" className="approvedRailBrand"><img src="/orange-design-preview/assets/logo-white.svg" alt="DriveDrop"/><small>Admin Portal</small></Link>}<nav aria-label={`${title} sidebar`}>{items.map(navItem)}</nav><div className="approvedRailBottom"><Link href="/help"><Icon name="help"/>Help & Support</Link><form action="/api/auth/logout" method="post"><button type="submit"><Icon name="out"/>Sign out</button></form></div></aside>}
 {key==='TRANSPORTER'&&!publicPage&&<nav className="approvedTransporterSubnav" aria-label="Transporter workspace">{items.slice(1).map(navItem)}</nav>}
 </div>
}
