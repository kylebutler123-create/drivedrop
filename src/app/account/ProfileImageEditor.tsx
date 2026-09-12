'use client';

import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

type ProfileImageKind='logo'|'transporter'|'truck';
type Images={logo:string|null;transporter:string|null;truck:string|null};
type Props={initialImages:Images;businessName:string};
type UploadProps={kind:ProfileImageKind;title:string;description:string;icon:string;initialUrl:string|null;businessName:string;shape:'logo'|'person'|'truck'};
type CropState={file:File;previewUrl:string};

async function createCroppedFile(source:CropState,kind:ProfileImageKind,zoom:number,positionX:number,positionY:number){
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const next=new Image();
    next.onload=()=>resolve(next);
    next.onerror=()=>reject(new Error('This photo could not be opened. Please choose another image.'));
    next.src=source.previewUrl;
  });
  const width=900;
  const height=kind==='truck'?563:900;
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Photo cropping is not supported by this browser.');
  const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight)*zoom;
  const drawWidth=image.naturalWidth*scale;
  const drawHeight=image.naturalHeight*scale;
  const x=-(drawWidth-width)*(positionX/100);
  const y=-(drawHeight-height)*(positionY/100);
  context.drawImage(image,x,y,drawWidth,drawHeight);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not prepare the cropped photo.')),'image/jpeg',.9));
  const baseName=source.file.name.replace(/\.[^.]+$/,'')||'profile-photo';
  return new File([blob],baseName+'-cropped.jpg',{type:'image/jpeg'});
}

function MediaUpload({kind,title,description,icon,initialUrl,businessName,shape}:UploadProps){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const [url,setUrl]=useState(initialUrl);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [crop,setCrop]=useState<CropState|null>(null);
  const [cropBusy,setCropBusy]=useState(false);
  const [cropError,setCropError]=useState('');
  const [zoom,setZoom]=useState(1);
  const [positionX,setPositionX]=useState(50);
  const [positionY,setPositionY]=useState(50);

  useEffect(()=>()=>{if(crop)URL.revokeObjectURL(crop.previewUrl)},[crop]);

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
      return null;
    }catch(error){
      const message=error instanceof Error?error.message:'Could not upload image';
      setNotice(message);
      return message;
    }finally{setBusy(false);if(inputRef.current)inputRef.current.value='';}
  }

  function chooseFile(file:File){
    if(kind==='logo'){void upload(file);return;}
    setZoom(1);setPositionX(50);setPositionY(50);setCropError('');
    setCrop({file,previewUrl:URL.createObjectURL(file)});
  }

  async function saveCrop(){
    if(!crop)return;
    setCropBusy(true);setCropError('');
    try{
      const croppedFile=await createCroppedFile(crop,kind,zoom,positionX,positionY);
      const error=await upload(croppedFile);
      if(error)setCropError(error);
      else setCrop(null);
    }catch(error){setCropError(error instanceof Error?error.message:'Could not crop this photo');}
    finally{setCropBusy(false);}
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
  const cropTitle=kind==='transporter'?'Crop your photo':'Crop your truck photo';

  return <article className="profileMediaItem">
    <div className={'profileMediaPreview '+shape}>{url?<img src={url} alt={alt}/>:<span aria-hidden="true">{icon}</span>}</div>
    <div className="profileMediaItemBody">
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="actionButtons">
        <label className={'btn orange'+(busy?' disabled':'')}>{busy?'Uploading…':url?'Change photo':'Upload photo'}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)chooseFile(file)}}/></label>
        {url&&<button className="btn light" type="button" disabled={busy} onClick={remove}>Remove</button>}
      </div>
      {notice&&<div role="status" className={'formNotice '+(notice.includes('successfully')||notice.includes('removed')?'successNotice':'errorNotice')}>{notice}</div>}
    </div>
    {crop&&<div className="profileCropBackdrop" role="dialog" aria-modal="true" aria-labelledby={'crop-title-'+kind}>
      <div className="profileCropDialog">
        <div className="profileCropHeading"><div><span>Adjust photo</span><h3 id={'crop-title-'+kind}>{cropTitle}</h3></div><button type="button" aria-label="Close photo cropper" disabled={cropBusy} onClick={()=>setCrop(null)}>×</button></div>
        <p>Move and zoom the photo until the important area fits inside the frame.</p>
        <div className={'profileCropPreview '+(kind==='truck'?'truck':'person')}>
          <img src={crop.previewUrl} alt="Photo crop preview" style={{objectPosition:positionX+'% '+positionY+'%',transform:'scale('+zoom+')',transformOrigin:positionX+'% '+positionY+'%'}}/>
          <span aria-hidden="true"/>
        </div>
        <div className="profileCropControls">
          <label><span>Zoom</span><input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
          <label><span>Move left or right</span><input type="range" min="0" max="100" value={positionX} onChange={e=>setPositionX(Number(e.target.value))}/></label>
          <label><span>Move up or down</span><input type="range" min="0" max="100" value={positionY} onChange={e=>setPositionY(Number(e.target.value))}/></label>
        </div>
        {cropError&&<div className="formNotice errorNotice" role="alert">{cropError}</div>}
        <div className="profileCropActions"><button className="btn light" type="button" disabled={cropBusy} onClick={()=>setCrop(null)}>Cancel</button><button className="btn orange" type="button" disabled={cropBusy||busy} onClick={saveCrop}>{cropBusy||busy?'Saving…':'Use cropped photo'}</button></div>
      </div>
    </div>}
  </article>;
}

export default function ProfileImageEditor({initialImages,businessName}:Props){
  return <section className="dashboardCard profileImageCard">
    <div className="panelHeading"><div><span className="panelIcon">📷</span><div><h2>Profile photos</h2><p>Help customers recognise you, your transport business and the vehicle that will collect their vehicle.</p></div></div></div>
    <p className="profileMediaHelp">Upload JPG, PNG or WebP images. Personal and truck photos can be repositioned and cropped before saving.</p>
    <div className="profileMediaEditorGrid">
      <MediaUpload kind="transporter" title="Your photo" description="A clear, professional photo of you. This will be your main display photo when customers compare quotes." icon="👤" initialUrl={initialImages.transporter} businessName={businessName} shape="person"/>
      <MediaUpload kind="truck" title="Truck photo" description="Show customers the truck or transporter vehicle you use for collections." icon="🚛" initialUrl={initialImages.truck} businessName={businessName} shape="truck"/>
      <MediaUpload kind="logo" title="Business logo" description="Your existing company logo remains available as part of your public profile." icon="🏢" initialUrl={initialImages.logo} businessName={businessName} shape="logo"/>
    </div>
  </section>;
}
