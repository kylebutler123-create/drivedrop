// Keep four attachments plus multipart overhead comfortably below the host's 4.5 MB request limit.
export const MESSAGE_IMAGE_BUDGET=900_000;
export async function prepareMessageImages(files:File[]):Promise<File[]>{
 const prepared:File[]=[];
 for(const file of files){
  if(file.size<=MESSAGE_IMAGE_BUDGET){prepared.push(file);continue;}
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
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    blob=await new Promise<Blob|null>(resolve=>canvas!.toBlob(resolve,'image/jpeg',0.88-attempt*0.06));
    if(blob&&blob.size>0&&blob.size<=MESSAGE_IMAGE_BUDGET)break;
    edge=Math.round(edge*0.75);
   }
   if(!blob||blob.size===0||blob.size>MESSAGE_IMAGE_BUDGET)throw new Error('Image could not be reduced');
   prepared.push(new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified}));
  }catch{throw new Error(`Unable to prepare “${file.name}”. Please choose a smaller JPG, PNG or WebP image.`);}
  finally{URL.revokeObjectURL(url);if(canvas){canvas.width=0;canvas.height=0;}}
 }
 return prepared;
}
