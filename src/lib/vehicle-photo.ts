export function vehiclePhotoUrl(job:{id?:string;vehiclePhotoPath?:string|null}|null|undefined){
 return job?.id&&job.vehiclePhotoPath?`/api/jobs/${encodeURIComponent(job.id)}/photo?v=${encodeURIComponent(job.vehiclePhotoPath.split('/').pop()||'')}`:null;
}
