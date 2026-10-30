'use client';

import {useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';
import MobileCustomerPhoto from './MobileCustomerPhoto';

type Role = 'CUSTOMER' | 'TRANSPORTER';
type InstallEvent = Event & {prompt: () => Promise<void>};

/** The installed app and mobile website deliberately use this same navigation. */
export default function MobileWorkspace({role, name}: {role: Role; name: string}) {
  const pathname = usePathname();
  const [view, setView] = useState('');
  const [focusedDelivery, setFocusedDelivery] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const transporter = role === 'TRANSPORTER';
  const root = transporter ? '/transporter' : '/customer';

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setView(params.get('view') || '');
      setFocusedDelivery(pathname === '/customer' && params.get('view') === 'bookings' && !!params.get('bookingId'));
    };
    const changed = (event: Event) => setView((event as CustomEvent<string>).detail.toLowerCase());
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('drivedrop:mobile-view', changed);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('drivedrop:mobile-view', changed);
    };
  }, [pathname]);

  useEffect(() => {
    const ready = (event: Event) => {event.preventDefault(); setInstall(event as InstallEvent)};
    const installed = () => setInstall(null);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', installed);
    return () => {window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', installed)};
  }, []);

  const active = pathname.startsWith('/account') || pathname === '/transporter/verification' ? 'account' : pathname.startsWith('/messages') ? 'messages'
    : pathname.startsWith('/transporter/quotes') || (pathname === root && view === 'quotes') ? 'quotes'
    : pathname.startsWith('/transporter/delivered') || (pathname === root && ['bookings','deliveries','completed','cancelled'].includes(view)) ? 'deliveries'
    : pathname === root && (!view || view === 'jobs' || view === 'all') ? 'home' : '';
  const links = [
    {id: 'home', label: transporter ? 'Jobs' : 'Home', icon: transporter ? 'search' : 'home', href: root},
    {id: 'quotes', label: transporter ? 'My quotes' : 'Quotes', icon: 'file', href: transporter ? '/transporter?view=quotes' : '/customer?view=quotes'},
    {id: 'deliveries', label: 'Deliveries', icon: 'truck', href: `${root}?view=${transporter ? 'deliveries' : 'bookings'}`},
    {id: 'account', label: 'Account', icon: 'user', href: '/account'},
  ];
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <>
    <header className={`ddMobileHeader${focusedDelivery ? ' ddDeliveryHeader' : ''}`}>
      {focusedDelivery ? <><a className="ddHeaderBack" href="/customer?view=bookings" aria-label="Back to deliveries"><Icon name="arrow"/></a><strong>Delivery details</strong></>
        : <a href={root} className="ddMobileBrand" aria-label="DriveDrop home"><img src="/orange-design-preview/assets/logo.svg" width="152" height="38" alt="DriveDrop"/></a>}
      <div className="ddHeaderActions"><NotificationNavLink/><details className="ddAccountMenu">
        <summary aria-label="Open account menu"><span className="ddAvatar">{role==='CUSTOMER'?<MobileCustomerPhoto name={name}/>:initials || <Icon name="user"/>}</span></summary>
        <div className="ddMenuPanel"><strong>{name}</strong><small>{transporter ? 'Transporter' : 'Customer'} account</small>
          <a href="/account"><Icon name="user"/>Manage account</a>
          {transporter ? <><a href="/transporter/proceeds"><Icon name="coins"/>Booked proceeds</a><a href="/transporter/verification"><Icon name="shield"/>Verification &amp; insurance</a><a href="/transporter/reviews"><Icon name="star"/>Reviews</a></> : <a href="/payments"><Icon name="wallet"/>Payments &amp; receipts</a>}
          <a href={`${root}?view=completed`}><Icon name="circleCheck"/>Completed deliveries</a>
          <a href={`${root}?view=cancelled`}><Icon name="ban"/>Cancelled deliveries</a>
          <a href="/help"><Icon name="help"/>Help &amp; support</a>
          {install ? <button type="button" onClick={async () => {await install.prompt(); setInstall(null)}}><Icon name="grid"/>Install DriveDrop</button>
            : <details className="ddInstallHelp"><summary>Add DriveDrop to your home screen</summary><p>On iPhone, open DriveDrop in Safari, tap Share, then Add to Home Screen. On Android, use your browser’s Install app or Add to Home screen option.</p></details>}
          <form action="/api/auth/logout" method="post"><button type="submit"><Icon name="out"/>Sign out</button></form>
        </div>
      </details></div>
    </header>
    <nav className="ddBottomNav" aria-label={`${transporter ? 'Transporter' : 'Customer'} navigation`}>
      {links.slice(0, 3).map(link => <a key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined}><Icon name={link.icon}/><span>{link.label}</span></a>)}
      <MessagesNavLink/>
      <a href="/account" aria-current={active === 'account' ? 'page' : undefined}><Icon name="user"/><span>Account</span></a>
    </nav>
  </>;
}
