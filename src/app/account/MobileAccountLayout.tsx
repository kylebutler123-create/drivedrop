'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from 'next/link';
import Icon from '../components/ApprovedIcon';
import {AccountEditorContext} from './AccountEditorContext';
import {MobileAccountHero, MobilePersonalDetails, MobileBusinessDetails, type MobileAccountInfo} from './MobileAccountDetails';
import AccountIcon from '../components/AccountDesignIcon';

type Section = 'overview' | 'personal' | 'business' | 'payouts' | 'alerts' | 'security' | 'close';
const titles: Record<Section, string> = {overview: 'Your account', personal: 'Personal details', business: 'Business & photos', payouts: 'Payout setup', alerts: 'Job email alerts', security: 'Login & security', close: 'Close account'};

function MenuRow({icon, title, description, onClick, href}: {icon: string; title: string; description: string; onClick?: () => void; href?: string}) {
  const content = <><span className="ddSettingsIcon"><Icon name={icon}/></span><span><strong>{title}</strong><small>{description}</small></span><Icon name="chevronRight"/></>;
  return href ? <Link className="ddSettingsRow" href={href}>{content}</Link> : <button className="ddSettingsRow" type="button" onClick={onClick}>{content}</button>;
}

/** Presents the existing account editors in mobile sections without duplicating their save flows. */
export default function MobileAccountLayout({children, className, name, role, status, info}: {children: ReactNode; className: string; name: string; role: string; status: string; info: MobileAccountInfo}) {
  const [section, setSection] = useState<Section>('overview');
  const [editing, setEditing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const transporter = role === 'TRANSPORTER';
  const mobileRole = transporter || role === 'CUSTOMER';
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#email-preferences') setSection('alerts');
      if (window.location.hash === '#stripe-payouts') setSection('payouts');
      if (window.location.hash === '#business') setSection('business');
    };
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  function open(next: Section) {
    setSection(next);
    requestAnimationFrame(() => {window.scrollTo({top: 0}); heading.current?.focus({preventScroll: true})});
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <AccountEditorContext.Provider value={{editing, setEditing}}><main className={`${className}${mobileRole ? ' ddAccountPage' : ''}`} data-mobile-account-section={section} data-mobile-account-editing={editing}>
    {mobileRole && <div className="ddMobileOnly ddAccountNavigation">
      {section === 'overview' ? <>
        <div className="ddAccountIntro"><h1 tabIndex={-1} ref={heading}>Your account</h1><p>Everything in one place.</p></div>
        <div className="ddAccountIdentity"><span className="ddAccountInitials">{initials}</span><div><strong>{name}</strong><span>{transporter ? 'Transporter' : 'Customer'} account</span><small data-state={status.toLowerCase()}>{status}</small></div><button type="button" aria-label="Edit personal details" onClick={() => open('personal')}><AccountIcon name="edit"/></button></div>
        <section className="ddSettingsGroup"><h2>{transporter ? 'Profile & business' : 'Your details'}</h2><div>
          <MenuRow icon="user" title="Personal details" description="Name, email and phone" onClick={() => open('personal')}/>
          {transporter && <><MenuRow icon="business" title="Business & photos" description="Your transporter profile" onClick={() => open('business')}/><MenuRow icon="shield" title="Verification & insurance" description="Documents and expiry dates" href="/transporter/verification"/></>}
        </div></section>
        <section className="ddSettingsGroup"><h2>Payments & preferences</h2><div>
          {transporter ? <><MenuRow icon="card" title="Payout setup" description="Manage your payment details" onClick={() => open('payouts')}/><MenuRow icon="bell" title="Job email alerts" description="Your email preferences" onClick={() => open('alerts')}/></> : <MenuRow icon="card" title="Payments & receipts" description="Your transport payment history" href="/payments"/>}
          <MenuRow icon="lock" title="Login & security" description="Email and password" onClick={() => open('security')}/>
        </div></section>
        <div className="ddAccountFooter"><a href="/help"><Icon name="help"/>Help &amp; support</a><form action="/api/auth/logout" method="post"><button type="submit"><Icon name="out"/>Sign out</button></form><button className="ddCloseLink" type="button" onClick={() => open('close')}><Icon name="trash"/>Close account</button></div>
      </> : <header className="ddAccountSubheading"><button type="button" onClick={() => open('overview')} aria-label="Back to account"><Icon name="arrow"/></button><h1 ref={heading} tabIndex={-1}>{titles[section]}</h1></header>}
      {section === 'personal' && <><MobileAccountHero name={name} subtitle={`${transporter ? 'Transporter' : 'Customer'} account`} status={status}/>{!editing && <MobilePersonalDetails name={name} role={role} info={info} onEdit={() => setEditing(true)}/>}</>}
      {section === 'business' && <><MobileAccountHero name={info.business?.businessName || name} subtitle="Your transporter profile" business/>{!editing && <MobileBusinessDetails info={info} onEdit={() => setEditing(true)}/>}</>}
    </div>}
    {children}
    {mobileRole && section === 'personal' && !editing && <button type="button" className="ddMobileOnly ddPersonalSecurityLink" onClick={() => open('security')}><span><Icon name="lock"/></span><div><strong>Login &amp; security</strong><small>Change your login email and password securely.</small></div><Icon name="chevronRight"/></button>}
  </main></AccountEditorContext.Provider>;
}
