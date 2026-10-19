import { NextResponse } from 'next/server';
import { requestOTP } from '@/lib/otpService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    const result = await requestOTP(phone.trim());

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('OTP send route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while sending OTP' },
      { status: 500 }
    );
  }
}
