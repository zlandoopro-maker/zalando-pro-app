interface Env {
  NOWPAYMENTS_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const invoiceId = params.invoiceId as string;

  const apiKey = env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN';

  if (!invoiceId || invoiceId === 'undefined' || invoiceId === 'null') {
    return new Response(JSON.stringify({ error: { message: 'Valid invoiceId is required' } }), {
      status: 400, headers: corsHeaders
    });
  }

  try {
    const invoiceResponse = await fetch(`https://api.nowpayments.io/v1/invoice/${invoiceId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await invoiceResponse.json();
    if (!invoiceResponse.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ payment_status: data.payment_status || 'waiting', raw: data }), {
      status: 200, headers: corsHeaders
    });

  } catch (error: any) {
    console.error('[NOWPayments] Status check error:', error);
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500, headers: corsHeaders
    });
  }
};
