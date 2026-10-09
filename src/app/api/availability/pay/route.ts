import {NextResponse} from 'next/server';
// Retired: payment must be authorised before transporter confirmation.
export async function POST(){return NextResponse.json({error:'Select the quote and authorise payment before requesting transporter confirmation.'},{status:410});}
