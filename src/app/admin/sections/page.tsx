import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import Icon from '@/app/components/ApprovedIcon';

const sections=[
 ['/admin','home','Control Centre','Overview and action counts'],
 ['/admin?view=users','users','User management','Accounts, access and activity'],
 ['/admin?view=verification','shield','Transporter verification','Licences and insurance'],
 ['/admin?view=operations','truck','Bookings & deliveries','Timelines, messages and evidence'],
 ['/admin?view=disputes','alert','Dispute management','Review and resolve issues'],
 ['/admin/payouts','wallet','Payouts','All payout states and records'],
 ['/admin/fines','file','Outstanding fines','Balances and fine history'],
 ['/admin/review-disputes','star','Review moderation','Challenged customer reviews'],
];
const workspace=[
 ['/messages','chat','Messages','Customer and transporter conversations'],
 ['/notifications','bell','Notifications','Account and delivery updates'],
 ['/account','user','Manage account','Your details and security'],
 ['/admin?view=all','grid','Show everything','All admin records on one page'],
];
function SectionLinks({items}:{items:string[][]}){
 return <div className="amAdminSectionList">{items.map(([href,icon,title,description])=><Link key={href} href={href}><span className="amAdminSectionIcon"><Icon name={icon}/></span><span><b>{title}</b><small>{description}</small></span><Icon name="chevronRight"/></Link>)}</div>;
}
export default async function AdminSections(){
 const user=await currentUser();
 if(!user||user.role!=='ADMIN'||user.accountStatus!=='ACTIVE')return <main className="shell dashboardShell"><section className="dashboardCard adminAccess"><h1>Admin access</h1><p>Administrator authentication is required.</p><Link className="btn orange" href="/login">Sign in as administrator</Link></section></main>;
 return <main className="shell dashboardShell adminShell amAdminSectionsPage">
  <header className="dashboardHero adminHero"><div><span className="dashboardEyebrow">Admin workspace</span><h1>All admin sections</h1><p>Everything you manage, in one place.</p></div></header>
  <SectionLinks items={sections}/>
  <h2 className="amAdminWorkspaceTitle">Your workspace</h2>
  <SectionLinks items={workspace}/>
  <form action="/api/auth/logout" method="post" className="amAdminSignout"><button type="submit"><Icon name="out"/>Sign out</button></form>
 </main>;
}
