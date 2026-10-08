export interface Env {
  NOWPAYMENTS_API_KEY: string;
  NOWPAYMENTS_IPN_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning',
};

async function hmacSha512(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function sortObject(obj: any): any {
  return Object.keys(obj).sort().reduce((result: any, key: string) => {
    result[key] = obj[key];
    return result;
  }, {});
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Only intercept /api/ routes. Other requests will automatically be served from static assets
    if (!url.pathname.startsWith('/api/')) {
      // Return 404 to fall through to the assets handler in newer workers
      return new Response('Not found', { status: 404 });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'Zalando Pro API (Cloudflare Worker)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Invoice endpoint
    if (url.pathname === '/api/crypto-pay/create' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { amount, userId, supabaseTransactionId } = body;

        const apiKey = env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN';
        const supabaseUrl = env.SUPABASE_URL || 'https://mklzftbjvngwwiivdkhs.supabase.co';
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_vfa-EIY2FIK0WM1yaRicOQ_FmDXE51x';

        if (!amount || !userId || !supabaseTransactionId) {
          return new Response(JSON.stringify({ error: { message: 'amount, userId, and supabaseTransactionId are required' } }), {
            status: 400, headers: corsHeaders
          });
        }

        if (Number(amount) < 10) {
          return new Response(JSON.stringify({ error: { message: 'Minimum deposit amount is $10.' } }), {
            status: 400, headers: corsHeaders
          });
        }

        const serverPublicUrl = `${url.protocol}//${url.host}`;
        const ipnCallbackUrl = `${serverPublicUrl}/api/crypto-pay/webhook`;

        const nowResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            price_amount: Number(amount),
            price_currency: 'usd',
            order_id: supabaseTransactionId,
            order_description: `Deposit for User ${userId}`,
            ipn_callback_url: ipnCallbackUrl,
            success_url: serverPublicUrl,
            cancel_url: serverPublicUrl
          })
        });

        const data: any = await nowResponse.json();

        if (!nowResponse.ok) {
          return new Response(JSON.stringify({ error: data }), {
            status: 400, headers: corsHeaders
          });
        }

        if (data.id) {
          await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${supabaseTransactionId}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ nowpayments_invoice_id: String(data.id) })
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: { message: err.message } }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Status check
    if (url.pathname.startsWith('/api/crypto-pay/status/') && request.method === 'GET') {
      try {
        const invoiceId = url.pathname.split('/').pop();
        const apiKey = env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN';

        if (!invoiceId) {
          return new Response(JSON.stringify({ error: { message: 'Valid invoiceId is required' } }), {
            status: 400, headers: corsHeaders
          });
        }

        const invoiceResponse = await fetch(`https://api.nowpayments.io/v1/invoice/${invoiceId}`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        });

        const data: any = await invoiceResponse.json();
        return new Response(JSON.stringify({ payment_status: data.payment_status || 'waiting', raw: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: { message: err.message } }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Webhook IPN
    if (url.pathname === '/api/crypto-pay/webhook' && request.method === 'POST') {
      try {
        const signature = request.headers.get('x-nowpayments-sig');
        const ipnSecret = env.NOWPAYMENTS_IPN_SECRET || 'KVxLsIowDGX6mp2agNZ7j3K0Bdy3Cr4f';
        const supabaseUrl = env.SUPABASE_URL || 'https://mklzftbjvngwwiivdkhs.supabase.co';
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_vfa-EIY2FIK0WM1yaRicOQ_FmDXE51x';

        const rawBody = await request.text();

        if (!signature) {
          return new Response(JSON.stringify({ error: 'Missing signature' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }

        const payload = JSON.parse(rawBody);
        const sortedPayload = sortObject(payload);
        const expectedSignature = await hmacSha512(ipnSecret, JSON.stringify(sortedPayload));

        if (expectedSignature !== signature) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
          });
        }

        const paymentStatus = payload.payment_status;
        const transactionId = payload.order_id;

        if (['finished', 'confirmed', 'sending'].includes(paymentStatus)) {
          const txRes = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
          });
          const txData: any = await txRes.json();
          const tx = Array.isArray(txData) ? txData[0] : null;

          if (tx && tx.status === 'pending') {
            await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`, {
              method: 'PATCH',
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' })
            });

            await fetch(`${supabaseUrl}/rest/v1/rpc/atomic_increment`, {
              method: 'POST',
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table_name: 'users',
                row_id: tx.user_id,
                increments: { balance: Number(tx.amount) }
              })
            });
          }
        }

        return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default 404 for unhandled API routes
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
