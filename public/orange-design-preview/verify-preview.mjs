import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const elements=new Map();
const getElementById=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',onclick:null,onchange:null,style:{},close:()=>{}});return elements.get(id)};
const store=new Map();
const context={
 document:{getElementById,querySelectorAll:()=>[],querySelector:()=>null,body:{classList:{contains:()=>false},style:{}}},
 location:{hash:'#/home'},window:{innerWidth:1440,addEventListener:()=>{},scrollTo:()=>{}},
 sessionStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'legal-content.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'supplementary-pages.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'review-interactions.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const screens=vm.runInContext('screens',context);
let failures=0;
for(const [,key] of screens){
 context.location.hash='#/'+key;
 try{vm.runInContext('render()',context)}catch(error){console.error(key,error);failures++;continue}
 const markup=getElementById('app').innerHTML;
 for(const [,target] of markup.matchAll(/href="#\/([^"]+)"/g)){if(!screens.some(s=>s[1]===target)){console.error(key,'unknown route',target);failures++}}
 if(markup.length<600||markup.includes('>undefined<')){console.error(key,'incomplete markup');failures++}
 for(const asset of markup.matchAll(/(?:src="|url\(')assets\/([^"']+)/g)){
  if(!fs.existsSync(path.join(root,'assets',asset[1]))){console.error(key,'missing asset',asset[1]);failures++}
 }
}
if(failures)process.exit(1);
console.log(`${screens.length} design states rendered; all referenced assets found.`);
