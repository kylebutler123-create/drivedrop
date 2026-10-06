const fs=require('node:fs'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const source=fs.readFileSync('src/app/components/TransporterQuotesSummary.tsx','utf8');
const {code}=swc.transformSync(source,{filename:'tile.tsx',jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const out={};new Function('exports','require',code)(out,id=>id==='next/link'?({children,...p})=>React.createElement('a',p,children):id==='./TransporterSummaryDecoration'?()=>null:require(id));
const html=renderToStaticMarkup(React.createElement(out.default));assert(html.includes('href="/transporter/quotes"'));assert(html.includes('My quotes'));assert(html.includes('data-my-quotes-summary'));assert(!html.includes('role="button"'));
const nav=fs.readFileSync('src/app/components/ApprovedWorkspaceNavigation.tsx','utf8');assert(nav.includes('[items[0],items[5],items[6],items[8],items[7]]'));assert(!nav.includes('[items[0],items[2],items[5]'));
const page=fs.readFileSync('src/app/transporter/page.tsx','utf8');assert.equal((page.match(/<TransporterQuotesSummary\/>/g)||[]).length,1);
const css=fs.readFileSync('src/app/transporter-account-polish.css','utf8');require('postcss').parse(css);assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));assert(source.includes('controller.abort()'));
console.log('PASS: quotes moved from header to dashboard native link, five desktop tiles, keyboard navigation and request cleanup');
