const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const css=postcss.parse(fs.readFileSync(path.join(__dirname,'../src/app/transporter-expanded-cards.css'),'utf8'));
let matched=0;
css.walkRules(rule=>{
 if(!rule.selector.includes(':is([data-poc],[data-pod-mount])>button.btn.orange.fullBtn'))return;
 matched++;
 assert.equal(rule.parent.name,'media');assert.equal(rule.parent.params,'(min-width:1024px)');
 assert(rule.selector.includes('body.approvedDesktop.role-transporter main.dashboardShell .transporterBooking'));
 const values=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n]));
 for(const [key,value] of Object.entries({width:'174px',height:'38px','min-height':'38px',padding:'11px 15px',font:'400 13px/16px Arial,sans-serif','white-space':'nowrap'})){
  assert.equal(values[key].value,value);assert.equal(values[key].important,true);
 }
});
assert.equal(matched,1);
console.log('PASS: equal collection/delivery launch-button dimensions, desktop-only scope, direct-child selector excludes proof-form submit controls.');
