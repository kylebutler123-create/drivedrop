import {MAX_VERIFICATION_UPLOAD_SIZE,verificationInputError} from './verification-file-policy';

export const VERIFICATION_PHOTO_MAX_EDGE=3200;
export function verificationPhotoDimensions(width:number,height:number){
  if(!width||!height||width*height>80_000_000)throw new Error('This photo is too large to process. Please choose a standard-resolution photo or PDF.');
  const scale=Math.min(1,VERIFICATION_PHOTO_MAX_EDGE/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
async function decodeImage(blob:Blob):Promise<{image:CanvasImageSource;width:number;height:number;release:()=>void}>{
  if(typeof createImageBitmap==='function'){
    try{const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});return {image:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close()}}catch{/* Try the browser's image decoder below. */}
  }
  const url=URL.createObjectURL(blob);
  try{
    const image=new Image();image.src=url;await image.decode();
    return {image,width:image.naturalWidth,height:image.naturalHeight,release:()=>URL.revokeObjectURL(url)};
  }catch{URL.revokeObjectURL(url);throw new Error('Unable to read this photo. Please save it as JPG, PNG or PDF and try again.')}
}
export async function prepareVerificationFile(file:File):Promise<File>{
  const error=verificationInputError(file);if(error)throw new Error(error);
  // Preserve the exact original PDF, including digital signatures and multi-page content.
  if(file.type==='application/pdf')return file;
  const heic=/^image\/(heic|heif)$/.test(file.type)||/\.(heic|heif)$/i.test(file.name);
  let source:Blob=file;
  if(heic){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      // Lazy, local conversion. No document is sent to a third-party conversion service.
      const {heicTo,isHeic}=await import('heic-to/csp');
      if(!(await isHeic(file)))throw new Error('Invalid HEIC');
      source=await Promise.race([
        heicTo({blob:file,type:'image/png'}),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Conversion timed out')),60000)}),
      ]);
    }catch{throw new Error('Unable to convert this HEIC/HEIF photo. Please export it as JPG or PDF and try again.')}
    finally{if(timer)clearTimeout(timer)}
  }
  const decoded=await decodeImage(source);
  try{
    const size=verificationPhotoDimensions(decoded.width,decoded.height);
    // Keep already-small originals lossless, particularly screenshots with small text.
    if(!heic&&size.width===decoded.width&&size.height===decoded.height&&file.size<=2*1024*1024)return file;
    const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
    const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare this photo. Please try a JPG or PDF.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(decoded.image,0,0,canvas.width,canvas.height);
    const type=file.type==='image/png'&&!heic?'image/png':'image/jpeg';
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to prepare this photo. Please try a JPG or PDF.')),type,0.92));
    canvas.width=0;canvas.height=0;
    // Never substitute a larger recompressed image for the original.
    if(!heic&&blob.size>=file.size)return file;
    if(blob.size>MAX_VERIFICATION_UPLOAD_SIZE)throw new Error('The converted photo is larger than 20 MB. Please choose a smaller photo.');
    const filename=file.name.replace(/\.[^.]+$/,'')+(type==='image/png'?'.png':'.jpg');
    return new File([blob],filename,{type,lastModified:file.lastModified});
  }finally{decoded.release()}
}
