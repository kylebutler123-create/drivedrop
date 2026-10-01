'use client';
import {useEffect,useState} from 'react';
import AccountEditor from './AccountEditor';
import EmailEditor from './EmailEditor';
import PasswordEditor from './PasswordEditor';
import CloseAccount from './CloseAccount';
import PhotoEditor from './CustomerPhotoEditor';
import Icon from '../components/AccountDesignIcon';
import '../customer-account-polish.css';
type Props={name:string;email:string;phone:string|null;status:string;memberSince:string};
export default function CustomerAccountDesktop(props:Props){
 const [desktop,setDesktop]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(min-width:1024px)');const sync=()=>setDesktop(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 if(!desktop)return null;
 const active=props.status.toLowerCase()==='active';
 return <main className="shell customerAccountPolish"><header className="customerAccountHeading"><div><h1>Your account</h1><p>View and maintain the details DriveDrop currently holds for your account in one place.</p></div><span className={'customerAccountStatus'+(active?' isActive':'')}>{props.status}</span></header>
 <div className="customerAccountColumns"><section className="customerPersonalCard"><header><Icon name="user"/><div><h2>Personal details</h2><p>Your main DriveDrop identity and login information.</p></div></header><div className="customerPersonalEditor"><AccountEditor name={props.name} email={props.email} phone={props.phone} role="CUSTOMER" customerDesktop/></div><div className="customerPersonalRead"><PhotoEditor name={props.name}/><dl>{[['Name',props.name],['Email address',props.email],['Phone number',props.phone||'Not provided'],['Account type','Customer'],['Account status',props.status],['Member since',props.memberSince]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{label==='Account status'?<span className={'customerAccountStatus'+(active?' isActive':'')}>{value}</span>:value}</dd></div>)}</dl><p className="customerAccountFootnote">Keep your name and contact number up to date.</p></div></section>
 <section className="customerSecurityCard"><h2><Icon name="shield"/>Account security</h2><div className="customerSecurityItem"><EmailEditor email={props.email} customerDesktop/></div><div className="customerSecurityItem"><PasswordEditor customerDesktop/></div></section></div>
 <section className="customerAccountClose"><Icon name="warning"/><CloseAccount/></section></main>;
}
