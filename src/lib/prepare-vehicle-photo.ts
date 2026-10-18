import {prepareUploadImages} from './prepare-message-images';
export async function prepareVehiclePhotoValue(value:FormDataEntryValue|null){
 if(!(value instanceof File)||!value.size)return undefined;
 const [file]=await prepareUploadImages([value]);
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Unable to read the vehicle photo. Please choose it again.'));reader.readAsDataURL(file)});
}
