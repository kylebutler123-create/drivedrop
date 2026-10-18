import {validateVehiclePhoto} from './supabase-storage';
export async function decodeVehiclePhoto(value:unknown){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>1_200_100)throw new Error('Vehicle photo is too large. Please select the photo again.');
 const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw new Error('Choose a JPG, PNG or WebP vehicle photo.');
 const bytes=Buffer.from(match[2],'base64');
 const file=new File([bytes],'vehicle-photo',{type:match[1]});
 const result=await validateVehiclePhoto(file);
 if(!result.ok)throw new Error(result.error);
 return {file,extension:result.extension};
}
