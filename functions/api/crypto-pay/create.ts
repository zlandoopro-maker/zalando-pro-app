interface Env {
  NOWPAYMENTS_API_KEY: string;
  NOWPAYMENTS_IPN_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning',
  'Content-Type': 'application/json',
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { amount?: number; userId?: string; supabaseTransactionId?: string };
    const { amount, userId, supabaseTransactionId } = body;

    const apiKey = env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'NOWPAYMENTS_API_KEY is missing in environment' } }), {
        status: 500, headers: corsHeaders
      });
    }

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

    // Determine webhook callback URL from the request origin
    const url = new URL(request.url);
    const serverPublicUrl = `${url.protocol}//${url.host}`;
    const ipnCallbackUrl = `${serverPublicUrl}/api/crypto-pay/webhook`;

    // Create NOWPayments invoice
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ZalandoProServer/1.0'
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

    const data = await response.json();
    if (!response.ok) {
      console.error('[NOWPayments] Invoice creation failed:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: data }), { status: 400, headers: corsHeaders });
    }

    // Update Supabase transaction with NOWPayments invoice_id
    if (data.id && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(`${env.SUPABASE_URL}/rest/v1/transactions?id=eq.${supabaseTransactionId}`, {
          method: 'PATCH',
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ nowpayments_invoice_id: String(data.id) })
        });
      } catch (e) {
        console.error('[NOWPayments] Failed to update Supabase transaction:', e);
      }
    }

    console.log(`[NOWPayments] Invoice created: ${data.id} for tx: ${supabaseTransactionId}`);
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('[NOWPayments] Create error:', error);
    return new Response(JSON.stringify({ error: { message: error.message || 'Internal server error' } }), {
      status: 500, headers: corsHeaders
    });
  }
};
