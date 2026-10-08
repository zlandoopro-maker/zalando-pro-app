interface Env {
  NOWPAYMENTS_IPN_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const signature = request.headers.get('x-nowpayments-sig');
  const ipnSecret = env.NOWPAYMENTS_IPN_SECRET || 'KVxLsIowDGX6mp2agNZ7j3K0Bdy3Cr4f';
  const rawBody = await request.text();

  console.log('[Webhook] NOWPayments IPN received');

  // Step 1: Verify signature exists
  if (!signature) {
    console.warn('[Webhook] Missing x-nowpayments-sig header');
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 2: HMAC-SHA512 Signature Verification
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Sort keys alphabetically (as NOWPayments docs specify)
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc: any, key) => { acc[key] = payload[key]; return acc; }, {});

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(ipnSecret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(sortedPayload)));
  const expectedSignature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedSignature !== signature) {
    console.warn('[Webhook] HMAC Signature MISMATCH');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('[Webhook] Signature verified successfully');

  // Step 3: Process the payment status
  const paymentStatus = payload.payment_status;
  const transactionId = payload.order_id;

  console.log(`[Webhook] Status: ${paymentStatus} | Transaction ID: ${transactionId}`);

  if (!transactionId) {
    return new Response(JSON.stringify({ received: true, note: 'No order_id, ignored' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = env.SUPABASE_URL || 'https://mklzftbjvngwwiivdkhs.supabase.co';
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_vfa-EIY2FIK0WM1yaRicOQ_FmDXE51x';

  // Helper: Supabase REST call
  const supabaseFetch = (path: string, options: RequestInit) =>
    fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(options.headers || {})
      }
    });

  // Step 4: Handle finished/confirmed payments
  if (['finished', 'confirmed', 'sending'].includes(paymentStatus)) {
    try {
      // Fetch the transaction
      const txRes = await supabaseFetch(`transactions?id=eq.${transactionId}&select=*`, { method: 'GET' });
      const txData = await txRes.json();
      const tx = Array.isArray(txData) ? txData[0] : null;

      if (!tx) {
        console.error('[Webhook] Transaction not found:', transactionId);
        return new Response(JSON.stringify({ received: true, note: 'Transaction not found' }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Idempotency: Only credit if still pending
      if (tx.status !== 'pending') {
        console.log(`[Webhook] Transaction ${transactionId} already processed. Skipping.`);
        return new Response(JSON.stringify({ received: true, note: 'Already processed' }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mark transaction as completed
      await supabaseFetch(`transactions?id=eq.${transactionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() })
      });

      // Credit user balance via RPC
      const userId = tx.user_id;
      const creditAmount = Number(tx.amount);

      await fetch(`${supabaseUrl}/rest/v1/rpc/atomic_increment`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table_name: 'users',
          row_id: userId,
          increments: { balance: creditAmount }
        })
      });

      console.log(`[Webhook] SUCCESS: Credited $${creditAmount} to user ${userId}`);

    } catch (err: any) {
      console.error('[Webhook] Processing error:', err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle failed/expired payments
  if (['failed', 'expired', 'refunded'].includes(paymentStatus)) {
    try {
      await supabaseFetch(`transactions?id=eq.${transactionId}&status=eq.pending`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString() })
      });
      console.log(`[Webhook] Transaction ${transactionId} marked as failed (${paymentStatus})`);
    } catch (err: any) {
      console.error('[Webhook] Error marking failed:', err.message);
    }
  }

  return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
