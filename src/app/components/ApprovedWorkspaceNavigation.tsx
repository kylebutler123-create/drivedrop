'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';
const menus:Record<string,string[][]>={
 CUSTOMER:[['/customer','grid','Overview'],['/customer?view=request','file','Get a Quote'],['/customer?view=quotes','file','Quote requests'],['/customer?view=bookings','car','Your deliveries'],['/customer?view=completed','check','Completed'],['/customer?view=cancelled','flag','Cancelled'],['/messages','chat','Messages'],['/notifications','shield','Notifications'],['/account','settings','Account']],
 TRANSPORTER:[['/transporter','grid','Dashboard'],['/transporter?view=jobs','search','Available jobs'],['/transporter/quotes','file','My submitted quotes'],['/transporter?view=deliveries','truck','Active deliveries'],['/transporter/delivered','check','Delivered'],['/transporter/proceeds','pound','Booked proceeds'],['/transporter/verification','shield','Verification'],['/account','user','Account'],['/transporter/reviews','star','Reviews']],
 ADMIN:[['/admin','grid','Control Centre'],['/admin?action=users','user','User management'],['/admin?action=verification','shield','Transporter verification'],['/admin?action=disputes','flag','Dispute management'],['/admin?action=operations','car','Bookings & deliveries'],['/admin/payouts','pound','Payouts'],['/admin/review-disputes','star','Review moderation'],['/messages','chat','Messages'],['/notifications','shield','Notifications'],['/account','settings','Account']]
};
export default function ApprovedWorkspaceNavigation({role,name}:{role:string;name:string}){
 const pathname=usePathname();const params=useSearchParams();const key=role in menus?role:'CUSTOMER';const admin=key==='ADMIN';const publicPage=['/','/how-it-works','/for-customers','/for-transporters','/about','/help','/contact','/terms','/privacy','/get-quotes'].includes(pathname);const rail=!publicPage&&(admin||key==='CUSTOMER'&&(pathname==='/account'||pathname==='/customer'&&!params.has('view')));const items=menus[key];
 const active=(href:string)=>{const [path,query]=href.split('?');return pathname===path&&(query?query===params.toString():!params.has('view')&&!params.has('action'))};
 const navItem=([href,icon,label]:string[])=> <a key={href} href={href} className={active(href)?'active':''} aria-current={active(href)?'page':undefined}><Icon name={icon}/><span>{label}</span></a>;
 const title=key==='CUSTOMER'?'Customer':key==='TRANSPORTER'?'Transporter':'Administrator';
 return <div className="approvedWorkspaceNav" data-role={key.toLowerCase()} data-rail={rail}>
 <header className="approvedAccountHeader"><Link className="approvedAccountBrand" href="/"><img src="/orange-design-preview/assets/logo.svg" alt="DriveDrop — Vehicle delivery, simplified"/></Link><nav aria-label="Desktop account navigation">{(admin?items.slice(0,1):key==='CUSTOMER'?[items[0],items[1],items[3],items[8]]:[items[0],items[1],items[3],items[5],items[6]]).map(navItem)}</nav><div className="approvedAccountActions"><MessagesNavLink/><NotificationNavLink/><Link href="/account" className="approvedAccountIdentity"><span className="approvedInitial">{name.trim().charAt(0).toUpperCase()}</span><span>{name}<small>{title}</small></span></Link><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sign out" title="Sign out"><Icon name="out"/></button></form></div></header>
 {rail&&<aside className="approvedRail">{admin&&<Link href="/admin" className="approvedRailBrand"><img src="/orange-design-preview/assets/logo-white.svg" alt="DriveDrop"/><small>Admin Portal</small></Link>}<nav aria-label={`${title} sidebar`}>{items.map(navItem)}</nav><div className="approvedRailBottom"><Link href="/help"><Icon name="help"/>Help & Support</Link><form action="/api/auth/logout" method="post"><button type="submit"><Icon name="out"/>Sign out</button></form></div></aside>}
 {key==='TRANSPORTER'&&!publicPage&&<nav className="approvedTransporterSubnav" aria-label="Transporter workspace">{items.slice(1).map(navItem)}</nav>}
 </div>
}
