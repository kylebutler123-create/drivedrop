const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),swc=require('next/dist/build/swc');
function load(relative,stubs={}){const file=path.resolve(relative),m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id in stubs?stubs[id]:original(id);m._compile(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2020'},module:{type:'commonjs'}}).code,file);return m.exports;}
const {prepareMessageImages,MESSAGE_IMAGE_BUDGET}=load('src/lib/prepare-message-images.ts');
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
 const Evidence=load('src/components/EvidenceUpload.tsx',{'@/app/components/DeliveryDesignIcon':{__esModule:true,default:({name})=>React.createElement('svg',{'data-icon':name})}}).default;
 for(const type of ['COLLECTION','DELIVERY']){const html=renderToStaticMarkup(React.createElement(Evidence,{bookingId:'test',type,desktopEvidence:true,onUploaded(){}}));assert(html.includes(`Add ${type.toLowerCase()} evidence`));assert(html.includes('data-icon="upload"'));assert(!html.includes('btn orange'));}
 const mobile=renderToStaticMarkup(React.createElement(Evidence,{bookingId:'test',type:'COLLECTION',transporterCard:true,onUploaded(){}}));assert(mobile.includes('Add collection photo'));assert(mobile.includes('btn orange'));
 console.log('PASS: 4.34 MiB and four-image payload budgets, small-original preservation, decode failure cleanup, approved evidence labels/icons and legacy mobile controls. Browser encoding is mocked.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
