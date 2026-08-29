'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

type Props={initialUrl:string|null;businessName:string};

export default function ProfileImageEditor({initialUrl,businessName}:Props){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [url,setUrl]=useState(initialUrl);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');

  async function upload(file:File){
    setBusy(true);setNotice('');
    try{
      const form=new FormData();form.append('file',file);
      const response=await fetch('/api/account/profile-image',{method:'POST',body:form});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not upload image');
      setUrl(body.url);setNotice('Profile image updated successfully.');router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not upload image');}
    finally{setBusy(false);if(inputRef.current)inputRef.current.value='';}
  }

  async function remove(){
    setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/account/profile-image',{method:'DELETE'});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not remove image');
      setUrl(null);setNotice('Profile image removed.');router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not remove image');}
    finally{setBusy(false);}
  }

  return <section className="dashboardCard profileImageCard">
    <div className="panelHeading"><div><span className="panelIcon">🏢</span><div><h2>Transporter profile image</h2><p>Add a company logo or professional profile image customers can recognise when comparing quotes.</p></div></div></div>
    <div className="profileImageEditor">
      <div className="profileImagePreview">{url?<img src={url} alt={`${businessName} profile`}/>:<span>🚛</span>}</div>
      <div className="profileImageControls"><strong>{businessName||'Your transport business'}</strong><p>Use a square JPG, PNG or WebP image up to 2 MB. A clear company logo works best.</p><div className="actionButtons"><label className={`btn orange${busy?' disabled':''}`}>{busy?'Uploading…':url?'Change image':'Upload image'}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file)}}/></label>{url&&<button className="btn light" type="button" disabled={busy} onClick={remove}>Remove image</button>}</div></div>
    </div>
    {notice&&<div className={`formNotice${notice.includes('success')||notice.includes('removed')?' successNotice':' errorNotice'}`}>{notice}</div>}
  </section>;
}
