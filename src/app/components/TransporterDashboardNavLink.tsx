'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

export default function TransporterDashboardNavLink(){
 const pathname=usePathname();
 const active=pathname==='/transporter'||pathname.startsWith('/transporter/');
 return <Link className={'btn orange transporterDashboardBtn'+(active?' isActive':'')} href="/transporter" aria-current={active?'page':undefined}><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></Link>;
}
