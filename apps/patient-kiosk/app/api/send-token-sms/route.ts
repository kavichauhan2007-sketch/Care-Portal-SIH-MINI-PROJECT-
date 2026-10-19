import { NextRequest, NextResponse } from 'next/server';

/**
 * Exotel RCS Omnichannel – Send Token SMS
 * Credentials supplied by user (account: abesit5, Mumbai region)
 * Docs: https://developer.exotel.com/docs/rcs-omnichannel/api-reference/send-message
 */

const EXOTEL_API_KEY    = process.env.EXOTEL_API_KEY || '';
const EXOTEL_API_TOKEN  = process.env.EXOTEL_API_TOKEN || '';
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID || '';
const EXOTEL_SUBDOMAIN  = process.env.EXOTEL_SUBDOMAIN || '@api.in.exotel.com'; // Mumbai region
const EXOTEL_BASE_URL   = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}${EXOTEL_SUBDOMAIN}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,          // 10-digit Indian mobile number (without +91)
      tokenNumber,    // e.g. "TK-204"
      patientName,    // e.g. "Ramesh Kumar"
      doctorName,     // e.g. "Dr. Rajesh Verma"
      roomInfo,       // e.g. "OPD Room 204 (Orthopedics Wing)"
      waitTime,       // e.g. "12-15 Mins"
    } = body;

    if (!phone || phone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number required.' },
        { status: 400 }
      );
    }

    const recipientE164 = `+91${phone}`;

    // ──────────────────────────────────────────────────────────────────
    // Build SMS body text
    // ──────────────────────────────────────────────────────────────────
    const smsText =
      `CarePortal OPD Token Confirmation\n` +
      `Patient: ${patientName || 'Patient'}\n` +
      `Token No: ${tokenNumber || 'N/A'}\n` +
      `Doctor: ${doctorName || 'Assigned Doctor'}\n` +
      `Room: ${roomInfo || 'OPD'}\n` +
      `Est. Wait: ${waitTime || 'N/A'}\n` +
      `Please proceed to the waiting area. - CarePortal`;

    // ──────────────────────────────────────────────────────────────────
    // Exotel RCS Omnichannel API payload
    // We use SMS-only fallback since no RCS BotID / template is provided.
    // The RCS messages array is empty; we use the root-level SMS fallback.
    // ──────────────────────────────────────────────────────────────────
    const payload = {
      custom_data: `TOKEN-${tokenNumber || 'OPD'}`,
      rcs: {
        messages: [
          {
            from: 'CPKIOSK',   // Sender ID (DLT registered, update if different)
            to: recipientE164,
            content: {
              type: 'template',
              template: {
                // Generic template; replace with your approved template name if available
                name: 'opd_token_confirmation',
                variables: {
                  TemplateParam1: patientName || 'Patient',
                  TemplateParam2: tokenNumber || 'N/A',
                  TemplateParam3: doctorName  || 'Doctor',
                },
              },
            },
            // SMS fallback for devices without RCS support
            fallback: {
              from: 'CPKIOSK',
              content: {
                text: smsText,
                sms_type: 'transactional',
              },
            },
          },
        ],
      },
    };

    const url = `${EXOTEL_BASE_URL}/v2/accounts/${EXOTEL_ACCOUNT_SID}/messages`;

    let exotelResponse: any = null;
    let exotelError: string | null = null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Basic auth is embedded in the URL per Exotel spec
        },
        body: JSON.stringify(payload),
        // Timeout guard (Node 18+ supports AbortSignal.timeout)
        signal: AbortSignal.timeout(12000),
      });

      const json = await res.json();
      exotelResponse = json;

      if (!res.ok) {
        exotelError = json?.response?.rcs?.messages?.[0]?.error_data?.message
          || json?.message
          || `HTTP ${res.status}`;
      }
    } catch (fetchErr: any) {
      exotelError = fetchErr?.message || 'Network error contacting Exotel API';
    }

    // ──────────────────────────────────────────────────────────────────
    // Evaluate result
    // ──────────────────────────────────────────────────────────────────
    if (exotelError) {
      console.error('[send-token-sms] Exotel error:', exotelError, exotelResponse);
      return NextResponse.json(
        {
          success: false,
          error: exotelError,
          raw: exotelResponse,
        },
        { status: 502 }
      );
    }

    const msgStatus = exotelResponse?.response?.rcs?.messages?.[0]?.status;
    const msgSid    = exotelResponse?.response?.rcs?.messages?.[0]?.data?.sid;

    return NextResponse.json({
      success: true,
      message: `Token SMS dispatched to +91 ${phone}`,
      sid: msgSid || null,
      status: msgStatus || 'accepted',
      requestId: exotelResponse?.request_id || null,
    });
  } catch (err: any) {
    console.error('[send-token-sms] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
