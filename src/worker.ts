export interface Env {
  NOWPAYMENTS_API_KEY: string;
  NOWPAYMENTS_IPN_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
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
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

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
        const { amount, currency = 'usdttrc20', orderId, userEmail, userId } = body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
          return new Response(JSON.stringify({ error: 'Valid deposit amount required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const apiKey = env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN';
        const finalOrderId = orderId || `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const payload = {
          price_amount: Number(amount),
          price_currency: 'usd',
          pay_currency: currency,
          order_id: finalOrderId,
          order_description: `Zalando Pro Balance Deposit ($${amount})`,
          ipn_callback_url: `${url.origin}/api/crypto-pay/webhook`,
          success_url: `${url.origin}/#deposit-success`,
          cancel_url: `${url.origin}/#deposit-cancel`,
        };

        const nowResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data: any = await nowResponse.json();

        if (!nowResponse.ok) {
          return new Response(JSON.stringify({
            error: data.message || data.error || 'Failed to create payment invoice',
            details: data
          }), {
            status: nowResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Record in Supabase if credentials available
        if (data.id && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            await fetch(`${env.SUPABASE_URL}/rest/v1/transactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                id: crypto.randomUUID(),
                user_id: userId || 'anonymous',
                type: 'deposit',
                amount: Number(amount),
                status: 'pending',
                order_id: finalOrderId,
                nowpayments_invoice_id: String(data.id),
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            console.error('Supabase transaction recording failed:', e);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          invoice_id: data.id,
          invoice_url: data.invoice_url,
          pay_address: data.pay_address,
          pay_amount: data.pay_amount,
          pay_currency: data.pay_currency,
          order_id: finalOrderId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Server error: ' + err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Status Check endpoint
    if (url.pathname.startsWith('/api/crypto-pay/status/') && request.method === 'GET') {
      try {
        const invoiceId = url.pathname.split('/').pop();
        const apiKey = env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN';

        const nowResponse = await fetch(`https://api.nowpayments.io/v1/payment/${invoiceId}`, {
          method: 'GET',
          headers: { 'x-api-key': apiKey }
        });

        const data: any = await nowResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Webhook IPN endpoint
    if (url.pathname === '/api/crypto-pay/webhook' && request.method === 'POST') {
      try {
        const signature = request.headers.get('x-nowpayments-sig');
        const bodyText = await request.text();

        if (env.NOWPAYMENTS_IPN_SECRET && signature) {
          const bodyJson = JSON.parse(bodyText);
          const sortedData = sortObject(bodyJson);
          const sortedString = JSON.stringify(sortedData);
          const expectedSig = await hmacSha512(env.NOWPAYMENTS_IPN_SECRET, sortedString);

          if (signature !== expectedSig) {
            return new Response(JSON.stringify({ error: 'Invalid IPN signature' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        const ipnData = JSON.parse(bodyText);
        const { payment_status, outcome_amount, order_id } = ipnData;

        if ((payment_status === 'finished' || payment_status === 'confirmed') && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          // Update transaction and user balance in Supabase
          const txRes = await fetch(`${env.SUPABASE_URL}/rest/v1/transactions?order_id=eq.${order_id}&select=*`, {
            headers: {
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          const txs: any = await txRes.json();
          const tx = txs?.[0];

          if (tx && tx.status !== 'completed') {
            const addAmount = Number(outcome_amount || tx.amount);

            // Mark transaction completed
            await fetch(`${env.SUPABASE_URL}/rest/v1/transactions?id=eq.${tx.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ status: 'completed' })
            });

            // Credit user balance
            if (tx.user_id && tx.user_id !== 'anonymous') {
              const userRes = await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${tx.user_id}&select=balance`, {
                headers: {
                  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                }
              });
              const users: any = await userRes.json();
              const currentBalance = Number(users?.[0]?.balance || 0);

              await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${tx.user_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({ balance: currentBalance + addAmount })
              });
            }
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback for static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
