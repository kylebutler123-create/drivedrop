'use client';

import Icon from '../components/ApprovedIcon';
import AccountIcon from '../components/AccountDesignIcon';

export type MobileAccountInfo = {email: string; phone?: string | null; memberSince: string; workRestricted?: boolean; business?: {businessName?: string | null; companyNumber?: string | null; phone?: string | null; businessAddress?: string | null; yearsOperating?: number | null; website?: string | null; status: string; submittedAt?: string | null; reviewedAt?: string | null; reviewNote?: string | null} | null};
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const initials = (value: string) => value.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();

export function MobileAccountHero({name, subtitle, status, business = false}: {name: string; subtitle: string; status?: string; business?: boolean}) {
  return <div className="ddAccountSectionHero"><span className="ddSectionAvatar">{business ? <Icon name="business"/> : initials(name)}</span><div><strong>{name}</strong><span>{subtitle}</span>{status && <small data-state={status.toLowerCase()}>{status}</small>}</div></div>;
}

export function MobilePersonalDetails({name, role, info, onEdit}: {name: string; role: string; info: MobileAccountInfo; onEdit: () => void}) {
  const rows = [['user', 'Full name', name], ['mail', 'Email address', info.email], ...(role === 'CUSTOMER' ? [['phone', 'Phone number', info.phone || 'Not provided']] : []), ['user', 'Account type', label(role)], ['calendar', 'Member since', info.memberSince]];
  return <div className="ddPersonalDetails"><h2>Your details</h2><dl>{rows.map(([icon, title, value]) => <div key={title}><span><Icon name={icon}/></span><dt>{title}</dt><dd>{value}</dd></div>)}</dl>{role === 'TRANSPORTER' && info.workRestricted && <p className="formNotice errorNotice" role="status">Transport work · Restricted</p>}<button type="button" className="ddPrimary" onClick={onEdit}><AccountIcon name="edit"/>Edit account details</button></div>;
}

export function MobileBusinessDetails({info, onEdit}: {info: MobileAccountInfo; onEdit: () => void}) {
  const business = info.business;
  const rows = [['Business name', business?.businessName], ['Company number', business?.companyNumber], ['Phone', business?.phone], ['Business address', business?.businessAddress], ['Years operating', business?.yearsOperating?.toString()], ['Website', business?.website]];
  return <div className="ddBusinessDetails"><div className="ddDetailsHeading"><h2>Business details</h2><button type="button" onClick={onEdit}><AccountIcon name="edit"/>Edit</button></div><dl>{rows.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>{business && <details className="ddBusinessReview"><summary>Verification record <span>{label(business.status)}</span><Icon name="chevronDown"/></summary><div>{business.submittedAt && <p>Submitted for review · {business.submittedAt}</p>}{business.reviewedAt && <p>Last reviewed · {business.reviewedAt}</p>}{business.reviewNote && <p><b>DriveDrop review note</b><br/>{business.reviewNote}</p>}<a href="/transporter/verification">Manage verification &amp; insurance <Icon name="arrow"/></a></div></details>}{!business && <a className="ddVerificationSetupLink" href="/transporter/verification">Set up transporter verification <Icon name="arrow"/></a>}</div>;
}
