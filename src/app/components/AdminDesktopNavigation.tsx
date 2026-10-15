 'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';
const sections=[['','home','Control Centre'],['users','users','User management'],['verification','shield','Transporter verification'],['disputes','flag','Dispute management'],['operations','car','Bookings & deliveries'],['payouts','pound','Payouts'],['review-disputes','star','Review moderation']];
export default function AdminDesktopNavigation({name}:{name:string}){
 const path=usePathname(),params=useSearchParams();
 const selected=path==='/admin'?(params.get('view')||params.get('action')||''):path.split('/')[2];
 return <div className="adminDesktopNav"><aside className="adminDesignSidebar"><Link href="/admin" className="adminDesignBrand"><img src="/orange-design-preview/assets/logo-white.svg" alt="DriveDrop"/></Link><nav aria-label="Administration">{sections.map(([key,icon,title])=><Link key={key} href={['payouts','review-disputes'].includes(key)?`/admin/${key}`:key?`/admin?view=${key}`:'/admin'} className={selected===key?'isActive':''} aria-current={selected===key?'page':undefined}><Icon name={icon}/><span>{title}</span></Link>)}</nav><div className="adminDesignSidebarBottom"><Link href="/"><Icon name="globe"/>View website</Link><Link href="/help"><Icon name="help"/>Help & support</Link></div></aside><header className="adminDesignTopbar"><span><b>DriveDrop</b><i>/</i>Administration</span><div className="adminDesignUtilities"><MessagesNavLink/><NotificationNavLink/><Link href="/account" className="adminDesignAccount"><Icon name="user"/>{name}</Link><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sign out" title="Sign out"><Icon name="out"/></button></form></div></header></div>;
}
