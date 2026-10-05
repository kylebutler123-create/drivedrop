// Safe to import in both the browser and the server (no credentials or Node APIs).
export const MAX_VERIFICATION_UPLOAD_SIZE = 20 * 1024 * 1024;
export const VERIFICATION_FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif';
export const VERIFICATION_FILE_TYPES = ['application/pdf','image/jpeg','image/png','image/heic','image/heif'];
export function verificationInputError(file:File):string|null {
  if(!file.size)return 'Choose a document to upload';
  if(file.size>MAX_VERIFICATION_UPLOAD_SIZE)return 'File must be 20 MB or smaller';
  // Some phones omit the MIME type for HEIC/HEIF. Contents are checked after conversion.
  if(!VERIFICATION_FILE_TYPES.includes(file.type)&&!(/\.(heic|heif)$/i.test(file.name)&&(!file.type||file.type==='application/octet-stream')))
    return 'Only PDF, JPG/JPEG, PNG and HEIC/HEIF files are allowed';
  return null;
}
