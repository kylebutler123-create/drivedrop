import './globals.css';
import './home-hero.css';
import './mobile-polish.css';
import './customer-desktop-header.css';
import './transporter-desktop-header.css';
import './dashboard-polish.css';
import './admin-dashboard-polish.css';
import './admin-header-colors.css';
import './admin-navigation-polish.css';
import './admin-verification-expander.css';
import './account-edit.css';
import './transporter-profile.css';
import './requote.css';
import './proof-of-delivery.css';
import './legacy-evidence-cleanup.css';
import './payment-secured-polish.css';
import './customer-booking-polish.css';
import './customer-card-expander.css';
import './transporter-card-expander.css';
import './transporter-next-action.css';
import './completed-booking-polish.css';
import './transporter-completed-polish.css';
import './admin-payouts.css';
import './messages-polish.css';
import './notifications-polish.css';
import './manage-requests-polish.css';
import './transporter-reviews-polish.css';
import './transporter-verification-polish.css';
import './customer-quote-comparison.css';
import './customer-quote-request-details.css';
import './active-delivery-vehicle-details.css';
import './customer-completed-summary.css';
import './customer-quoted-request-highlight.css';
import './customer-desktop-action-buttons.css';
import './transporter-desktop-action-buttons.css';
import './transporter-proceeds-desktop.css';
import './transporter-available-jobs-desktop.css';
import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import MessagesNavLink from '@/app/components/MessagesNavLink';
import NotificationNavLink from '@/app/components/NotificationNavLink';
import CustomerQuoteRequestNavigator from '@/app/components/CustomerQuoteRequestNavigator';
import CustomerDashboardNavLink from '@/app/components/CustomerDashboardNavLink';
import TransporterDashboardNavLink from '@/app/components/TransporterDashboardNavLink';
import HeaderLogoImage from '@/app/components/HeaderLogoImage';


import TransporterDeliveredSummary from '@/app/components/TransporterDeliveredSummary';
import TransporterCancelDeliveryEnhancer from '@/app/components/TransporterCancelDeliveryEnhancer';
import TransporterNextActionEnhancer from '@/app/components/TransporterNextActionEnhancer';
import CustomerProofOfCollectionEnhancer from '@/app/components/CustomerProofOfCollectionEnhancer';
import CustomerProofOfDeliveryEnhancer from '@/app/components/CustomerProofOfDeliveryEnhancer';
import CustomerCardExpander from '@/app/components/CustomerCardExpander';
import CustomerQuoteComparisonEnhancer from '@/app/components/CustomerQuoteComparisonEnhancer';



import TransporterCardExpander from '@/app/components/TransporterCardExpander';
export const metadata={title:'DriveDrop',description:'UK vehicle transport marketplace'};
export default async function Layout({children}:{children:React.ReactNode}){const user=await currentUser();const dashboardHref=user?.role==='CUSTOMER'?'/customer':user?.role==='TRANSPORTER'?'/transporter':user?.role==='ADMIN'?'/admin':'/login';const reviewHref=user?.role==='TRANSPORTER'?'/transporter/reviews':user?.role==='ADMIN'?'/admin/review-disputes':null;const reviewLabel=user?.role==='TRANSPORTER'?'Reviews':user?.role==='ADMIN'?'Review moderation':null;return <html lang="en"><body><CustomerQuoteRequestNavigator/>{user?.role==='CUSTOMER'&&<><CustomerProofOfCollectionEnhancer/><CustomerProofOfDeliveryEnhancer/><CustomerCardExpander/><CustomerQuoteComparisonEnhancer/></>}{user?.role==='TRANSPORTER'&&<><TransporterDeliveredSummary/><TransporterCancelDeliveryEnhancer/><TransporterNextActionEnhancer/><TransporterCardExpander/></>}<header className={`top${user?.role==='TRANSPORTER'?' transporterTop':user?.role==='CUSTOMER'?' customerTop':user?.role==='ADMIN'?' adminTop':!user?' guestTop':''}`}>{user?.role==='CUSTOMER'?<div className="customerPrimaryNav"><Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><HeaderLogoImage/></Link><Link className="accountNavBtn" href="/account"><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Account</span></Link><CustomerDashboardNavLink/><form action="/api/auth/logout" method="post"><button className="btn light" type="submit"><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg><span>Sign out</span></button></form></div>:user?.role==='TRANSPORTER'?<div className="transporterPrimaryNav"><Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><HeaderLogoImage/></Link><Link className="btn light accountNavBtn" href="/account"><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Account</span></Link><TransporterDashboardNavLink/><form action="/api/auth/logout" method="post"><button className="btn light" type="submit"><svg className="mobileNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg><span>Sign out</span></button></form></div>:user?.role==='ADMIN'?<div className="adminPrimaryNav"><Link href="/" className="logo headerLogo adminHeaderLogo" aria-label="DriveDrop home"><HeaderLogoImage/></Link><span className="adminHeaderLabel"><small>Workspace</small><strong>Admin</strong></span></div>:!user?<div className="guestPrimaryNav"><Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><HeaderLogoImage/></Link><Link className="btn light" href="/login?account=customer">Customer login</Link><Link className="btn orange" href="/login?account=transporter">Transporter login</Link></div>:<Link href="/" className="logo headerLogo" aria-label="DriveDrop home"><HeaderLogoImage/></Link>}<nav className={`nav${user?.role==='ADMIN'?' adminHeaderNav':''}`}>{user?<>{user.role==='TRANSPORTER'?<span className="transporterSecondaryNav"><MessagesNavLink/><NotificationNavLink/></span>:user.role==='CUSTOMER'?<span className="customerSecondaryNav"><MessagesNavLink/><NotificationNavLink/></span>:<><span className="adminMessagesRow"><MessagesNavLink/></span><NotificationNavLink/>{reviewHref&&reviewLabel&&<Link className="adminHeaderLink" href={reviewHref}><svg className="adminNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg><span>{reviewLabel}</span></Link>}<Link className="btn light accountNavBtn adminHeaderButton" href="/account"><svg className="adminNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Account</span></Link><Link className="btn orange adminHeaderButton adminDashboardButton" href={dashboardHref}><svg className="adminNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></Link><form className="adminSignOutForm" action="/api/auth/logout" method="post"><button className="btn light adminHeaderButton adminSignOutButton" type="submit"><svg className="adminNavIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg><span>Sign out</span></button></form></>}</>:null}</nav></header>{children}</body></html>}
