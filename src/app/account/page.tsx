import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';

const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default async function AccountPage(){
  const sessionUser=await currentUser();
  if(!sessionUser)redirect('/login');

  const user=await prisma.user.findUnique({
    where:{id:sessionUser.id},
    select:{
      name:true,
      email:true,
      role:true,
      accountStatus:true,
      workRestricted:true,
      createdAt:true,
      transporterVerification:{
        select:{
          businessName:true,
          companyNumber:true,
          businessAddress:true,
          phone:true,
          yearsOperating:true,
          website:true,
          status:true,
          submittedAt:true,
          reviewedAt:true,
          reviewNote:true,
          documents:{select:{id:true,type:true,status:true,expiresAt:true,insurer:true,policyNumber:true},orderBy:{createdAt:'desc'}}
        }
      }
    }
  });

  if(!user)redirect('/login');
  const dashboardHref=user.role==='CUSTOMER'?'/customer':user.role==='TRANSPORTER'?'/transporter':'/admin';
  const verification=user.transporterVerification;

  return <main className="shell dashboardShell accountPage">
    <Link className="backLink" href={dashboardHref}>← Back to dashboard</Link>
    <header className="dashboardHero accountHero">
      <div>
        <span className="dashboardEyebrow">Account</span>
        <h1>Your account information</h1>
        <p>View the details DriveDrop currently holds for your account in one place.</p>
      </div>
      <div className="adminHeroBadge accountStatusBadge">
        <span>Account status</span>
        <strong>{label(user.accountStatus)}</strong>
        <small>{label(user.role)}</small>
      </div>
    </header>

    <div className="accountGrid">
      <section className="dashboardCard accountCard">
        <div className="panelHeading"><div><span className="panelIcon">👤</span><div><h2>Personal details</h2><p>Your main DriveDrop identity and login information.</p></div></div></div>
        <div className="infoPanel accountInfoPanel">
          <div className="infoRow"><span>Name</span><b>{user.name}</b></div>
          <div className="infoRow"><span>Email address</span><b>{user.email}</b></div>
          <div className="infoRow"><span>Account type</span><b>{label(user.role)}</b></div>
          <div className="infoRow"><span>Account status</span><b>{label(user.accountStatus)}</b></div>
          <div className="infoRow"><span>Member since</span><b>{user.createdAt.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</b></div>
          {user.role==='TRANSPORTER'&&<div className="infoRow"><span>Transport work</span><b>{user.workRestricted?'Restricted':'Permitted'}</b></div>}
        </div>
      </section>

      {user.role==='TRANSPORTER'&&<section className="dashboardCard accountCard">
        <div className="panelHeading"><div><span className="panelIcon">🚛</span><div><h2>Transporter business</h2><p>Business and verification information connected to your transporter account.</p></div></div></div>
        {verification?<>
          <div className="infoPanel accountInfoPanel">
            <div className="infoRow"><span>Business name</span><b>{verification.businessName||'Not provided'}</b></div>
            <div className="infoRow"><span>Company number</span><b>{verification.companyNumber||'Not provided'}</b></div>
            <div className="infoRow"><span>Phone</span><b>{verification.phone||'Not provided'}</b></div>
            <div className="infoRow"><span>Business address</span><b>{verification.businessAddress||'Not provided'}</b></div>
            <div className="infoRow"><span>Years operating</span><b>{verification.yearsOperating??'Not provided'}</b></div>
            <div className="infoRow"><span>Website</span><b>{verification.website||'Not provided'}</b></div>
            <div className="infoRow"><span>Verification status</span><b>{label(verification.status)}</b></div>
            {verification.submittedAt&&<div className="infoRow"><span>Submitted for review</span><b>{verification.submittedAt.toLocaleDateString('en-GB')}</b></div>}
            {verification.reviewedAt&&<div className="infoRow"><span>Last reviewed</span><b>{verification.reviewedAt.toLocaleDateString('en-GB')}</b></div>}
          </div>
          {verification.reviewNote&&<div className="formNotice"><strong>DriveDrop review note</strong><div style={{marginTop:4}}>{verification.reviewNote}</div></div>}
          <div className="actionButtons accountActions"><Link className="btn orange" href="/transporter/verification">Manage verification & insurance</Link></div>
        </>:<div className="emptyState"><div>✓</div><h3>Verification details not started</h3><p>Add your business and verification information before quoting for work.</p><Link className="btn orange" href="/transporter/verification">Set up transporter verification</Link></div>}
      </section>}

      {user.role==='TRANSPORTER'&&verification&&<section className="dashboardCard accountCard accountDocumentsCard">
        <div className="panelHeading"><div><span className="panelIcon">📄</span><div><h2>Verification documents</h2><p>Current document records attached to your transporter verification.</p></div></div></div>
        {verification.documents.length===0?<p className="muted">No verification documents have been uploaded yet.</p>:<div className="accountDocumentList">{verification.documents.map(doc=><div className="accountDocumentRow" key={doc.id}><div><strong>{label(doc.type)}</strong><small>{doc.insurer||doc.policyNumber?[doc.insurer,doc.policyNumber].filter(Boolean).join(' · '):'Secure verification document'}</small></div><div><span className="statusPill">{label(doc.status)}</span>{doc.expiresAt&&<small>Expires {doc.expiresAt.toLocaleDateString('en-GB')}</small>}</div></div>)}</div>}
      </section>}
    </div>
  </main>;
}
