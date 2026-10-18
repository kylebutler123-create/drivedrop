const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
const {prepareMessageImages,prepareUploadImages,MESSAGE_IMAGE_BUDGET}=load('src/lib/prepare-message-images.ts');
let calls=0,released=0,fail=false,quality=[];
global.Image=class{naturalWidth=4032;naturalHeight=3024;async decode(){if(fail)throw Error('bad image')}};
URL.createObjectURL=()=> 'blob:local';URL.revokeObjectURL=()=>released++;
global.document={createElement(){return{width:0,height:0,getContext(){return{fillRect(){},drawImage(){}}},toBlob(callback,type,q){quality.push(q);callback(new Blob([new Uint8Array(++calls%2?1_100_000:700_000)],{type}))}}}};
async function run(){
 const original=new File([new Uint8Array(Math.round(4.34*1024*1024))],'large.png',{type:'image/png'});
 const small=new File(['small'],'small.png',{type:'image/png'});
 const result=await prepareMessageImages([original,small]);assert(result[0].size<=MESSAGE_IMAGE_BUDGET);assert.equal(result[0].type,'image/jpeg');assert.equal(result[0].name,'large.jpg');assert.equal(result[1],small);assert(original.size>4_500_000);assert.equal(released,1);assert(quality[1]<quality[0]);
 const multiple=await prepareMessageImages(Array(4).fill(original));assert(multiple.reduce((n,f)=>n+f.size,0)<3_600_001);assert.equal(released,5);
 fail=true;await assert.rejects(prepareMessageImages([original]),/Unable to prepare/);assert.equal(released,6);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const Evidence=load('src/components/EvidenceUpload.tsx',{'@/lib/prepare-message-images':{prepareUploadImages},'@/app/components/DeliveryDesignIcon':{__esModule:true,default:({name})=>React.createElement('svg',{'data-icon':name})}}).default;
 for(const type of ['COLLECTION','DELIVERY']){const html=renderToStaticMarkup(React.createElement(Evidence,{bookingId:'test',type,desktopEvidence:true,onUploaded(){}}));assert(html.includes(`Add ${type.toLowerCase()} evidence`));assert(html.includes('data-icon="upload"'));assert(!html.includes('btn orange'));}
 const mobile=renderToStaticMarkup(React.createElement(Evidence,{bookingId:'test',type:'COLLECTION',transporterCard:true,onUploaded(){}}));assert(mobile.includes('Add collection photo'));assert(mobile.includes('btn orange'));
 fail=false;
 global.document.createElement=()=>({width:0,height:0,getContext(){return{fillRect(){},drawImage(){}}},toBlob(callback,type){callback(new Blob([new Uint8Array(300_000)],{type}))}});
 const six=await prepareUploadImages(Array(6).fill(original),{reservedBytes:200_000});assert(six.reduce((n,f)=>n+f.size,200_000)<=3_600_000);
 const logo=(await prepareUploadImages([original],{preserveTransparency:true}))[0];assert.equal(logo.type,'image/png');assert(logo.name.endsWith('.png'));
 await assert.rejects(prepareUploadImages([original],{reservedBytes:1_000_001}),/signature/);
 await assert.rejects(prepareUploadImages([new File(['bad'],'bad.svg',{type:'image/svg+xml'})]),/JPG/);
 for(const file of ['src/app/components/TransporterProofOfDeliveryEnhancer.tsx','src/components/EvidenceUpload.tsx','src/app/account/CustomerPhotoEditor.tsx','src/app/account/ProfileImageEditor.tsx'])assert(fs.readFileSync(file,'utf8').includes('await prepareUploadImages('),file);
 assert(fs.readFileSync('src/app/messages/page.tsx','utf8').includes('await prepareMessageImages(images)'));
 const collection=fs.readFileSync('src/app/components/TransporterProofOfCollectionEnhancer.tsx','utf8');assert(collection.includes('const PHOTO_REQUEST_BUDGET=3*1024*1024'));assert(collection.includes('await preparePhotos(photos)'));
 const verification=fs.readFileSync('src/lib/upload-verification-document.ts','utf8');assert(verification.includes('await prepareVerificationFile(file)'));assert(verification.includes('fetch(ticket.signedUrl'));
 console.log('PASS: 4.34 MiB, four/six-image request budgets with signature reserve, PNG logos, originals preserved, all upload entry points, existing collection and direct verification protection. Browser encoding is mocked.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
