import Icon from '@/app/components/ApprovedIcon';
import AccountEditor from './AccountEditor';
import EmailEditor from './EmailEditor';
import PasswordEditor from './PasswordEditor';
import CloseAccount from './CloseAccount';

type Props={name:string;email:string;phone:string|null;status:string;accountState:string;memberSince:string};
export default function AdminAccountDesktop({name,email,phone,status,accountState,memberSince}:Props){
 return <main className="shell dashboardShell adminShell adminAccountDesktop">
  <div className="adminAccountHeading"><div><h1>Your account</h1><p>Manage your personal details and sign-in security.</p></div><span className="adminAccountState" data-account-state={accountState}><Icon name={accountState==='ACTIVE'?'circleCheck':'alert'}/>{status} account</span></div>
  <div className="adminAccountColumns">
   <section className="adminAccountPanel"><h2><Icon name="user"/>Personal details</h2><div className="adminAccountDetails">
    <div className="adminAccountIdentity"><span className="adminAccountInitial" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>{email}</small></div><span className="adminAccountRole">Administrator</span></div>
    <dl>{[['Name',name],['Email address',email],['Account type','Admin'],['Account status',status],['Member since',memberSince]].map(([title,value])=><div className="adminAccountDetail" key={title}><dt>{title}</dt><dd data-account-state={title==='Account status'?accountState:undefined}>{value}</dd></div>)}</dl>
   </div><div className="adminAccountEdit"><AccountEditor name={name} email={email} phone={phone} role="ADMIN" customerDesktop/></div></section>
   <section className="adminAccountPanel adminAccountSecurity"><h2><Icon name="shield"/>Login &amp; security</h2><div className="adminAccountSecurityItem"><span className="adminAccountSecurityIcon" aria-hidden="true"><Icon name="mail"/></span><EmailEditor email={email} transporterDesktop/></div><div className="adminAccountSecurityItem"><span className="adminAccountSecurityIcon" aria-hidden="true"><Icon name="lock"/></span><PasswordEditor transporterDesktop/></div></section>
  </div><div className="adminAccountClose"><CloseAccount/></div>
 </main>;
}
