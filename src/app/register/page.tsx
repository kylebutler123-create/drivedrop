'use client';

import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';

export default function Register(){
  const router=useRouter();
  const [transporter,setTransporter]=useState(false);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setTransporter(new URLSearchParams(window.location.search).get('account')==='transporter');
  },[]);

  async function submit(e:any){
    e.preventDefault();
    setErr('');
    const f=new FormData(e.currentTarget);
    const res=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});
    const d=await res.json();
    if(!res.ok)return setErr(d.error);
    router.push(d.role==='CUSTOMER'?'/customer':'/transporter');
  }

  return <main className="shell"><div className="card" style={{maxWidth:560,margin:'auto'}}>
    <h1>{transporter?'Join DriveDrop as a transporter':'Join DriveDrop'}</h1>
    <form onSubmit={submit}>
      <div className="field"><label>NAME / BUSINESS NAME</label><input name="name" required/></div>
      <div className="field"><label>EMAIL</label><input type="email" name="email" autoComplete="email" required/></div>
      <div className="field"><label>PASSWORD</label><input type="password" name="password" minLength={8} autoComplete="new-password" required/></div>
      <div className="field"><label>ACCOUNT TYPE</label><select name="role" value={transporter?'TRANSPORTER':'CUSTOMER'} onChange={e=>setTransporter(e.target.value==='TRANSPORTER')}><option value="CUSTOMER">Customer</option><option value="TRANSPORTER">Transporter</option></select></div>
      {err&&<p className="error">{err}</p>}
      <button className="btn orange">Create account</button>
    </form>
  </div></main>;
}
