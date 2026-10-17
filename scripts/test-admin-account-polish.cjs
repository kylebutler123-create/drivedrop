const assert=require('node:assert/strict'),fs=require('node:fs'),postcss=require('postcss');
const css=postcss.parse(fs.readFileSync('src/app/admin-account-desktop.css','utf8'));
for(const n of css.nodes){
 if(n.type==='comment')continue;
 if(n.type==='rule'){
  assert.equal(n.selector,'.adminAccountDesktop');assert.equal(n.nodes.length,1);assert.equal(n.nodes[0].prop,'display');assert.equal(n.nodes[0].value,'none');
 }else{assert.equal(n.name,'media');assert.match(n.params,/min-width:\s*1024px/);n.walkRules(rule=>assert(rule.selector.startsWith('body.approvedDesktop.role-admin .adminAccount')));}
}
const page=fs.readFileSync('src/app/account/page.tsx','utf8'),desktop=fs.readFileSync('src/app/account/AdminAccountDesktop.tsx','utf8');
assert(page.includes("user.role==='ADMIN'&&<AdminAccountDesktop"));
assert(page.includes("user.role==='ADMIN'?' adminAccountLegacy':''"));
for(const name of ['AccountEditor','EmailEditor','PasswordEditor','CloseAccount'])assert(desktop.includes('<'+name));
assert(desktop.includes('role="ADMIN"'));assert(!desktop.includes('fetch('));
assert(!desktop.includes('admin@example.com'));assert(!desktop.includes('Alex Morgan'));
for(const title of ['Personal details','Login &amp; security','Member since','Account status'])assert(desktop.includes(title));
console.log('PASS: admin-only desktop layout, mobile/tablet isolation, live account data and existing account controls reused.');
const navigation=fs.readFileSync('src/app/components/ApprovedWorkspaceNavigation.tsx','utf8');
assert(navigation.includes("pathname==='/notifications'||pathname==='/account'))return <AdminDesktopNavigation"));
const closeHeading=[];css.walkRules(rule=>{if(rule.selector.endsWith('.dangerPanel>div>strong'))closeHeading.push(rule);});
assert.equal(closeHeading.length,1);
assert(closeHeading[0].nodes.some(n=>n.prop==='grid-column'&&n.value==='2'));
assert(closeHeading[0].nodes.some(n=>n.prop==='grid-row'&&n.value==='1'));
console.log('PASS: account uses current admin navigation and closure text has explicit grid placement.');
