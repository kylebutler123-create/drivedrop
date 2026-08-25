const base=(process.env.BASE_URL||'http://localhost:3000').replace(/\/$/,'')
const checks=[]
async function check(name,path){try{const r=await fetch(base+path,{redirect:'manual'});const text=await r.text();checks.push({name,status:r.status,ok:r.ok,detail:text.slice(0,180)})}catch(e){checks.push({name,status:0,ok:false,detail:String(e)})}}
await check('Home','/')
await check('Health','/api/health')
await check('Register page','/register')
await check('Login page','/login')
await check('Customer dashboard','/customer')
await check('Transporter dashboard','/transporter')
await check('Admin dashboard','/admin')
console.table(checks.map(({name,status,ok})=>({name,status,ok})))
for(const x of checks.filter(x=>!x.ok)) console.error(`FAIL ${x.name}: ${x.detail}`)
if(checks.some(x=>!x.ok)) process.exitCode=1
