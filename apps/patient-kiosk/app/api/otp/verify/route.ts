import { NextResponse } from 'next/server';
import { verifyStoredOTP } from '@/lib/otpService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    const verificationResult = await verifyStoredOTP(phone.toString(), code.toString());

    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: verificationResult.error || 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        verified: true, 
        message: 'Phone number verified successfully' 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('OTP verify route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while verifying OTP' },
      { status: 500 }
    );
  }
}
