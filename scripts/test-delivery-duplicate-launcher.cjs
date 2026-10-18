const assert=require('node:assert/strict');
const fs=require('node:fs');
const postcss=require('postcss');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'../',file),'utf8');
const legacy=postcss.parse(read('src/app/transporter-expanded-cards.css'));
const current=postcss.parse(read('src/app/transporter-delivery-four-column.css'));
let oldSelector;
legacy.walkRules(rule=>{
 if(rule.selector.endsWith(':is([data-poc],[data-pod-mount])>button.btn.orange.fullBtn'))oldSelector=rule.selector;
});
assert(oldSelector);
let matches=0;
current.walkRules(rule=>{
 if(!rule.selector.includes(oldSelector.replace(' :is(', ' .tdFourColumns :is(')))return;
 matches++;
 assert.equal(rule.parent.name,'media');
 assert.equal(rule.parent.params,'screen and (min-width:1024px)');
 assert(rule.nodes.some(n=>n.prop==='display'&&n.value==='none'&&n.important));
});
assert.equal(matches,1,'Hide rule must exceed legacy specificity by one class, only on desktop');
const compact=read('src/app/components/TransporterCompactRow.tsx');
assert(compact.includes("mount.querySelector<HTMLButtonElement>(':scope > button')?.click()"));
assert(read('src/app/components/TransporterDeliveryProof.tsx').includes("openActiveProof(card,collection?'collection':'delivery')"));
console.log('PASS: legacy duplicate launchers hidden on desktop; proof-column actions retain existing form handlers.');
