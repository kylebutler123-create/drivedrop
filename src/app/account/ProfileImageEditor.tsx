'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

type ProfileImageKind='logo'|'transporter'|'truck';
type Images={logo:string|null;transporter:string|null;truck:string|null};
type Props={initialImages:Images;businessName:string};
type UploadProps={kind:ProfileImageKind;title:string;description:string;icon:string;initialUrl:string|null;businessName:string;shape:'logo'|'person'|'truck'};

function MediaUpload({kind,title,description,icon,initialUrl,businessName,shape}:UploadProps){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [url,setUrl]=useState(initialUrl);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');

  async function upload(file:File){
    setBusy(true);setNotice('');
    try{
      const form=new FormData();
      form.append('kind',kind);
      form.append('file',file);
      const response=await fetch('/api/account/profile-image',{method:'POST',body:form});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not upload image');
      setUrl(body.url);
      setNotice(title+' updated successfully.');
      router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not upload image');}
    finally{setBusy(false);if(inputRef.current)inputRef.current.value='';}
  }

  async function remove(){
    setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/account/profile-image?kind='+kind,{method:'DELETE'});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not remove image');
      setUrl(null);
      setNotice(title+' removed.');
      router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:'Could not remove image');}
    finally{setBusy(false);}
  }

  const alt=kind==='logo'?businessName+' business logo':kind==='transporter'?businessName+' transporter':'Transport vehicle';

  return <article className="profileMediaItem">
    <div className={'profileMediaPreview '+shape}>{url?<img src={url} alt={alt}/>:<span aria-hidden="true">{icon}</span>}</div>
    <div className="profileMediaItemBody">
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="actionButtons">
        <label className={'btn orange'+(busy?' disabled':'')}>{busy?'Uploading…':url?'Change photo':'Upload photo'}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file)}}/></label>
        {url&&<button className="btn light" type="button" disabled={busy} onClick={remove}>Remove</button>}
      </div>
      {notice&&<div role="status" className={'formNotice '+(notice.includes('successfully')||notice.includes('removed')?'successNotice':'errorNotice')}>{notice}</div>}
    </div>
  </article>;
}

export default function ProfileImageEditor({initialImages,businessName}:Props){
  return <section className="dashboardCard profileImageCard">
    <div className="panelHeading"><div><span className="panelIcon">📷</span><div><h2>Profile photos</h2><p>Help customers recognise you, your transport business and the vehicle that will collect their vehicle.</p></div></div></div>
    <p className="profileMediaHelp">Upload JPG, PNG or WebP images up to 2 MB each. You can change or remove each image independently.</p>
    <div className="profileMediaEditorGrid">
      <MediaUpload kind="transporter" title="Your photo" description="A clear, professional photo of you. This will be your main display photo when customers compare quotes." icon="👤" initialUrl={initialImages.transporter} businessName={businessName} shape="person"/>
      <MediaUpload kind="truck" title="Truck photo" description="Show customers the truck or transporter vehicle you use for collections." icon="🚛" initialUrl={initialImages.truck} businessName={businessName} shape="truck"/>
      <MediaUpload kind="logo" title="Business logo" description="Your existing company logo remains available as part of your public profile." icon="🏢" initialUrl={initialImages.logo} businessName={businessName} shape="logo"/>
    </div>
  </section>;
}
