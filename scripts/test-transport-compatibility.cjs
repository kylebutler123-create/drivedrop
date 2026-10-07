const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),swc=require('next/dist/build/swc');
const cache={};function load(name){const file=path.resolve(__dirname,'../src/lib',name+'.ts');if(cache[file])return cache[file];const out={};cache[file]=out;const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;new Function('exports','require',code)(out,id=>id.startsWith('@/lib/')?load(id.slice(6)):require(id));return out;}
const {isTransportRunningCompatible:running,isTransportVehicleCompatible:vehicle}=load('transport-compatibility');let count=0;
for(const type of ['ANY','DRIVEN','OPEN','ENCLOSED'])for(const value of [true,false,'true','false']){assert.equal(running(type,value),!(type==='DRIVEN'&&(value===false||value==='false')));count++;}
assert.equal(running('driven',false),false);count++;
assert.equal(vehicle('ENCLOSED','Van'),false);count++;
assert.equal(vehicle('ENCLOSED','Car'),true);count++;
console.log(`PASS: ${count} transport/running and existing enclosed compatibility checks`);
