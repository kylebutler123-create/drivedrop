import type { NextConfig } from 'next'
const nextConfig:NextConfig={
  poweredByHeader:false,
  reactStrictMode:true,
  async headers(){return [{source:'/:path*',headers:[
    {key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"},
    {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}
  ]}]}
}
export default nextConfig
