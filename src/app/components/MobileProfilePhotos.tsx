'use client';

import {useId, useState} from 'react';
import Icon from './ApprovedIcon';

export type ProfilePhoto = {url:string;title:string;caption:string;kind:'person'|'truck'|'logo'};

export function ProfileImage({url, alt, initials, kind='person'}:{url?:string|null;alt:string;initials?:string;kind?:ProfilePhoto['kind']}){
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  return <div className={`ddPublicProfileImage ${kind}`}>
    {url&&url!==failedUrl?<img src={url} alt={alt} loading="lazy" onError={()=>setFailedUrl(url)} ref={image=>{
      // A server-rendered image can fail before its error handler is attached.
      if(image?.complete&&image.naturalWidth===0)setFailedUrl(url);
    }}/>:<span role="img" aria-label={initials?alt:'Photo unavailable'}>{initials||<><Icon name={kind==='truck'?'truck':kind==='logo'?'business':'user'}/><small>Photo unavailable</small></>}</span>}
  </div>;
}

export default function MobileProfilePhotos({photos}:{photos:ProfilePhoto[]}){
  const [expanded,setExpanded]=useState(false);
  const id=useId();
  if(!photos.length)return null;
  const [first,...remaining]=photos;
  const photo=(item:ProfilePhoto)=><figure key={item.kind}><ProfileImage url={item.url} alt={item.title} kind={item.kind}/><figcaption><strong>{item.title}</strong><span>{item.caption}</span></figcaption></figure>;
  return <section className="ddPublicProfilePhotos" aria-label="Transporter photos">
    <div className="ddPublicProfileSectionHeading"><h2>Photos</h2>{remaining.length>0&&<button type="button" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show less':'View all'}<Icon name={expanded?'chevronDown':'chevronRight'}/></button>}</div>
    {photo(first)}
    <div id={id} hidden={!expanded} className="ddPublicProfileExtraPhotos">{remaining.map(photo)}</div>
  </section>;
}
