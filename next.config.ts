import type { NextConfig } from 'next'
// Permit direct uploads only to this project's configured storage origin.
const storageOrigin=(()=>{try{const url=new URL(process.env.SUPABASE_URL||'');return url.protocol==='https:'?url.origin:''}catch{return ''}})()
const nextConfig:NextConfig={
  poweredByHeader:false,
  reactStrictMode:true,
  outputFileTracingIncludes:{'/api/customer/payments/download':['./public/payment-fonts/*.ttf'],'/api/transporter/proceeds/export':['./public/payment-fonts/*.ttf']},
  async headers(){return [{source:'/:path*',headers:[
    {key:'Content-Security-Policy',value:`default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self' ${storageOrigin}; frame-src 'self' https://www.openstreetmap.org https://www.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self)'},
    {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}
  ]},
  // Canonicals consolidate public aliases; this also keeps deployment hosts out
  // of search without redirecting Stripe callbacks or authenticated sessions.
  {source:'/:path*',missing:[{type:'host',value:'drive-drop\\.com'}],headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]},
  ...['/api/:path*','/orange-design-preview','/orange-design-preview/index.html','/desktop-design-proposal','/desktop-design-proposal/index.html'].map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}))
  ]}
}
export default nextConfig
