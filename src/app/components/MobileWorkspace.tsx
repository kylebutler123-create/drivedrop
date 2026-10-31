'use client';

import {useEffect, useRef, useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Icon from './ApprovedIcon';
import MessagesNavLink from './MessagesNavLink';
import NotificationNavLink from './NotificationNavLink';
import MobileCustomerPhoto from './MobileCustomerPhoto';

type Role = 'CUSTOMER' | 'TRANSPORTER';
type InstallEvent = Event & {prompt: () => Promise<void>};

/** The installed app and mobile website deliberately use this same navigation. */
export default function MobileWorkspace({role, name}: {role: Role; name: string}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const accountMenu = useRef<HTMLDetailsElement>(null);
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
    accountMenu.current?.removeAttribute('open');
    window.addEventListener('popstate', sync);
    window.addEventListener('drivedrop:mobile-view', changed);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('drivedrop:mobile-view', changed);
    };
  }, [pathname, query]);

  useEffect(() => {
    const ready = (event: Event) => {event.preventDefault(); setInstall(event as InstallEvent)};
    const installed = () => setInstall(null);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', installed);
    return () => {window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', installed)};
  }, []);

  const active = pathname.startsWith('/account') || ['/transporter/verification','/transporter/proceeds','/payments'].includes(pathname) ? 'account' : pathname.startsWith('/messages') ? 'messages'
    : pathname.startsWith('/transporter/quotes') || (pathname === root && view === 'quotes') ? 'quotes'
    : pathname.startsWith('/transporter/delivered') || (pathname === root && ['bookings','deliveries','completed','cancelled'].includes(view)) ? 'deliveries'
    : pathname === root && (!view || view === 'jobs' || view === 'all') ? 'home' : '';
  const links = [
    {id: 'home', label: transporter ? 'Jobs' : 'Home', icon: transporter ? 'search' : 'home', href: root},
    {id: 'quotes', label: transporter ? 'My quotes' : 'Quotes', icon: 'file', href: transporter ? '/transporter?view=quotes' : '/customer?view=quotes'},
    {id: 'deliveries', label: 'Deliveries', icon: 'truck', href: `${root}?view=${transporter ? 'deliveries' : 'bookings'}`},
    {id: 'account', label: 'Account', icon: 'user', href: '/account'},
  ];
  const navigateTo = (href: string) => {
    accountMenu.current?.removeAttribute('open');
    const next = new URL(href, window.location.origin);
    if (next.pathname === window.location.pathname && next.search === window.location.search) {
      window.dispatchEvent(new Event('drivedrop:mobile-navigate'));
      window.scrollTo({top: 0});
    }
  };
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <>
    <header className={`ddMobileHeader${focusedDelivery ? ' ddDeliveryHeader' : ''}`}>
      {focusedDelivery ? <><Link className="ddHeaderBack" href="/customer?view=bookings" aria-label="Back to deliveries"><Icon name="arrow"/></Link><strong>Delivery details</strong></>
        : <Link href={root} onNavigate={() => navigateTo(root)} className="ddMobileBrand" aria-label="DriveDrop home"><img src="/orange-design-preview/assets/logo.svg" width="152" height="38" alt="DriveDrop"/></Link>}
      <div className="ddHeaderActions"><NotificationNavLink/><details ref={accountMenu} className="ddAccountMenu">
        <summary aria-label="Open account menu"><span className="ddAvatar">{role==='CUSTOMER'?<MobileCustomerPhoto name={name}/>:initials || <Icon name="user"/>}</span></summary>
        <div className="ddMenuPanel"><strong>{name}</strong><small>{transporter ? 'Transporter' : 'Customer'} account</small>
          <Link href="/account"><Icon name="user"/>Manage account</Link>
          {transporter ? <><Link href="/transporter/proceeds"><Icon name="coins"/>Booked proceeds</Link><Link href="/transporter/verification"><Icon name="shield"/>Verification &amp; insurance</Link><Link href="/transporter/reviews"><Icon name="star"/>Reviews</Link></> : <Link href="/payments"><Icon name="wallet"/>Payments &amp; receipts</Link>}
          <Link href={`${root}?view=completed`}><Icon name="circleCheck"/>Completed deliveries</Link>
          <Link href={`${root}?view=cancelled`}><Icon name="ban"/>Cancelled deliveries</Link>
          <Link href="/help"><Icon name="help"/>Help &amp; support</Link>
          {install ? <button type="button" onClick={async () => {await install.prompt(); setInstall(null)}}><Icon name="grid"/>Install DriveDrop</button>
            : <details className="ddInstallHelp"><summary>Add DriveDrop to your home screen</summary><p>On iPhone, open DriveDrop in Safari, tap Share, then Add to Home Screen. On Android, use your browser’s Install app or Add to Home screen option.</p></details>}
          <form action="/api/auth/logout" method="post"><button type="submit"><Icon name="out"/>Sign out</button></form>
        </div>
      </details></div>
    </header>
    <nav className="ddBottomNav" aria-label={`${transporter ? 'Transporter' : 'Customer'} navigation`}>
      {links.slice(0, 3).map(link => <Link key={link.id} href={link.href} onNavigate={() => navigateTo(link.href)} aria-current={active === link.id ? 'page' : undefined}><Icon name={link.icon}/><span>{link.label}</span></Link>)}
      <MessagesNavLink/>
      <Link href="/account" aria-current={active === 'account' ? 'page' : undefined}><Icon name="user"/><span>Account</span></Link>
    </nav>
  </>;
}
