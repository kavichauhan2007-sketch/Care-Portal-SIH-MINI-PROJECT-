// CarePortal Twilio Verify (v2) OTP Service
// Real Twilio Verify API integration for sending and checking OTP codes.

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || '';

/**
 * Normalizes phone number into E.164 international format (e.g. +919084636775).
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = (phone || '').toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned; // default to India (+91)
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Helper to construct the Basic Auth header for Twilio API calls.
 */
function getTwilioAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

/**
 * Sends a real OTP verification code via Twilio Verify (v2) API.
 * Endpoint: POST https://verify.twilio.com/v2/Services/{ServiceSid}/Verifications
 */
export async function requestOTP(rawPhone: string): Promise<{ 
  success: boolean; 
  formattedPhone: string; 
  message: string; 
  error?: string;
  sid?: string;
}> {
  const formattedPhone = normalizePhoneNumber(rawPhone);

  try {
    const endpoint = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('Channel', 'sms');

    console.log(`[Twilio Verify] Dispatching real verification code to ${formattedPhone} via Service: ${TWILIO_VERIFY_SERVICE_SID}...`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': getTwilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Twilio Verify Send Error]', data);
      return {
        success: false,
        formattedPhone,
        message: data.message || 'Failed to send verification SMS',
        error: data.message || `Twilio error HTTP ${res.status}`,
      };
    }

    console.log(`[Twilio Verify Success] SID: ${data.sid} | Status: ${data.status} | To: ${data.to}`);

    return {
      success: true,
      formattedPhone,
      sid: data.sid,
      message: `Real verification code sent to ${formattedPhone} via SMS.`,
    };
  } catch (error: any) {
    console.error('[Twilio Verify Exception]', error);
    return {
      success: false,
      formattedPhone,
      message: error.message || 'Network error while contacting Twilio Verify API',
      error: error.message || 'Twilio network request failed',
    };
  }
}

/**
 * Checks and verifies the user's OTP code via Twilio Verify (v2) API.
 * Endpoint: POST https://verify.twilio.com/v2/Services/{ServiceSid}/VerificationCheck
 */
export async function verifyStoredOTP(
  rawPhone: string, 
  inputCode: string
): Promise<{ success: boolean; error?: string; status?: string }> {
  const formattedPhone = normalizePhoneNumber(rawPhone);
  const cleanCode = (inputCode || '').toString().replace(/\D/g, '').trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit verification code.',
    };
  }

  try {
    const endpoint = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('Code', cleanCode);

    console.log(`[Twilio VerifyCheck] Checking OTP for ${formattedPhone}...`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': getTwilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Twilio VerifyCheck Error]', data);
      if (data.code === 20404) {
        return {
          success: false,
          error: 'Verification session expired or not found. Please click "Resend OTP".',
        };
      }
      return {
        success: false,
        error: data.message || `Twilio check error HTTP ${res.status}`,
      };
    }

    console.log(`[Twilio VerifyCheck Result] Status: ${data.status} | Valid: ${data.valid}`);

    if (data.status === 'approved' && data.valid === true) {
      return {
        success: true,
        status: data.status,
      };
    } else {
      return {
        success: false,
        status: data.status,
        error: 'Invalid verification code. Please check your SMS and try again.',
      };
    }
  } catch (error: any) {
    console.error('[Twilio VerifyCheck Exception]', error);
    return {
      success: false,
      error: error.message || 'Network error while verifying code with Twilio.',
    };
  }
}
