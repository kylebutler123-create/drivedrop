// Keep four attachments plus multipart overhead comfortably below the host's 4.5 MB request limit.
export const MESSAGE_IMAGE_BUDGET=900_000;
export async function prepareUploadImages(files:File[],options:{reservedBytes?:number;preserveTransparency?:boolean}={}):Promise<File[]>{
 const reserved=options.reservedBytes??0;
 if(!Number.isFinite(reserved)||reserved<0||reserved>1_000_000)throw new Error('The signature is too large. Please clear it and sign again.');
 const budget=Math.min(MESSAGE_IMAGE_BUDGET,Math.floor((3_600_000-reserved)/Math.max(1,files.length)));
 const prepared:File[]=[];
 for(const file of files){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0)throw new Error('Choose a non-empty JPG, PNG or WebP image.');
  if(file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
  if(file.size<=budget){prepared.push(file);continue;}
  const url=URL.createObjectURL(file);
  const image=new Image();
  let canvas:HTMLCanvasElement|undefined;
  try{
   image.src=url;await image.decode();
   if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80_000_000)throw new Error('Image dimensions are too large');
   canvas=document.createElement('canvas');
   let edge=2400,blob:Blob|null=null;
   for(let attempt=0;attempt<5;attempt++){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('Image processing unavailable');
    if(!options.preserveTransparency){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);}
    context.drawImage(image,0,0,canvas.width,canvas.height);
    blob=await new Promise<Blob|null>(resolve=>canvas!.toBlob(resolve,options.preserveTransparency?'image/png':'image/jpeg',0.88-attempt*0.06));
    if(blob&&blob.size>0&&blob.size<=budget)break;
    edge=Math.round(edge*0.75);
   }
   if(!blob||blob.size===0||blob.size>budget)throw new Error('Image could not be reduced');
   prepared.push(new File([blob],file.name.replace(/\.[^.]+$/,'')+(options.preserveTransparency?'.png':'.jpg'),{type:blob.type,lastModified:file.lastModified}));
  }catch{throw new Error(`Unable to prepare “${file.name}”. Please choose a smaller JPG, PNG or WebP image.`);}
  finally{URL.revokeObjectURL(url);if(canvas){canvas.width=0;canvas.height=0;}}
 }
 return prepared;
}
export const prepareMessageImages=(files:File[])=>prepareUploadImages(files);
