'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';

export default function AdminMobileWorkspace({name}:{name:string}){
 const pathname=usePathname();
 const params=useSearchParams();
 const view=params.get('view')||params.get('action');
 const home=pathname==='/admin'&&!view;
 const users=pathname==='/admin'&&view==='users';
 const payouts=pathname==='/admin/payouts';
 const messages=pathname==='/messages'||pathname.startsWith('/messages/');
 const more=!home&&!users&&!payouts&&!messages;
 const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'A';
 return <>
  <header className="amAdminMobileHeader">
   <Link href="/admin" className="amAdminBrand" aria-label="MoveAMotor Control Centre"><img src="/moveamotor-logo-dark.svg" alt="MoveAMotor" width="152" height="38"/></Link>
   <div className="amAdminHeaderActions"><NotificationNavLink/><Link href="/account" className="amAdminAvatar" aria-label="Manage your account">{initials}</Link></div>
  </header>
  <nav className="amAdminMobileNav" aria-label="Mobile admin navigation">
   <Link href="/admin" aria-current={home?'page':undefined}><Icon name="home"/><span>Home</span></Link>
   <Link href="/admin?view=users" aria-current={users?'page':undefined}><Icon name="users"/><span>Users</span></Link>
   <Link href="/admin/payouts" aria-current={payouts?'page':undefined}><Icon name="wallet"/><span>Payouts</span></Link>
   <MessagesNavLink/>
   <Link href="/admin/sections" aria-current={more?'page':undefined}><Icon name="grid"/><span>More</span></Link>
  </nav>
 </>;
}
