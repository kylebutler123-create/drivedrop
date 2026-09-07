'use client';
export default function StatementPrintButton(){
 return <button type="button" className="btn orange" onClick={()=>window.print()}>Print / save as PDF</button>;
}
