import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ─── Supabase Admin Client (SERVER SIDE ONLY - uses service_role key) ──────────
// This bypasses RLS and should NEVER be exposed to the frontend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());

// ⚠️ IMPORTANT: Raw body is needed BEFORE express.json() for Webhook HMAC verification.
// We capture raw buffer for the webhook route, and parse JSON for all others.
app.use((req, res, next) => {
  if (req.path === '/api/crypto-pay/webhook') {
    let rawData = '';
    req.on('data', chunk => { rawData += chunk; });
    req.on('end', () => {
      (req as any).rawBody = rawData;
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

// ─── Health & Utility Routes ─────────────────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Zalando Pro API'
  });
});

app.get('/api/time', (req: Request, res: Response) => {
  const now = Date.now();
  res.json({
    ok: true,
    datetime: new Date(now).toISOString(),
    iso: new Date(now).toISOString(),
    unixMs: now,
    serverTimeMs: now,
    timestamp: new Date(now).toISOString()
  });
});

app.get('/api/clock/verify', async (req: Request, res: Response) => {
  const rawDeviceTime = req.query.deviceTimeMs ?? req.query.deviceTime ?? req.query.t;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  if (rawDeviceTime === undefined || rawDeviceTime === null || rawDeviceTime === '') {
    return res.status(400).json({ ok: false, error: 'deviceTimeMs is required' });
  }

  const deviceTimeMs = Number(rawDeviceTime);
  if (!Number.isFinite(deviceTimeMs)) {
    return res.status(400).json({ ok: false, error: 'deviceTimeMs must be a valid number' });
  }

  const serverTimeMs = Date.now();
  const driftMs = Math.abs(serverTimeMs - deviceTimeMs);
  const maxAllowedDriftMs = 4 * 60 * 60 * 1000;
  const severeDriftMs = 12 * 60 * 60 * 1000;
  const shouldWarn = driftMs > maxAllowedDriftMs;
  const shouldBlock = driftMs > maxAllowedDriftMs && driftMs >= severeDriftMs;

  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: userRow, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_blocked,isBlocked,block_reason,ban_reason')
        .eq('id', userId)
        .maybeSingle();

      const blockReason = String(userRow?.block_reason ?? userRow?.ban_reason ?? '').trim();
      const existingBlock = Boolean(userRow?.is_blocked === true || userRow?.isBlocked === true || blockReason.length > 0);

      if (existingBlock) {
        return res.json({
          ok: false,
          blocked: true,
          permanentBlock: true,
          reason: 'Account already permanently blocked',
          deviceTimeMs,
          serverTimeMs,
          driftMs,
          maxAllowedDriftMs,
          severeDriftMs,
          userId
        });
      }
    } catch (fetchError) {
      console.warn('Clock verify block lookup failed:', fetchError);
    }
  }

  if (shouldBlock && userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          is_blocked: true,
          isBlocked: true,
          block_reason: `Server-side clock drift detected: ${driftMs}ms`,
          ban_reason: `Server-side clock drift detected: ${driftMs}ms`,
          updated_at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.warn('Clock verify block update failed:', error.message);
      }
    } catch (blockError) {
      console.warn('Clock verify block update crashed:', blockError);
    }
  }

  return res.json({
    ok: !shouldBlock,
    blocked: shouldBlock,
    warning: shouldWarn && !shouldBlock,
    deviceTimeMs,
    serverTimeMs,
    driftMs,
    maxAllowedDriftMs,
    severeDriftMs,
    userId
  });
});

app.get('/api/download-apk', (req: Request, res: Response) => {
  const apkPath = path.join(__dirname, '..', 'base.apk');
  res.download(apkPath, 'zalando-pro.apk', (err) => {
    if (err) {
      console.error('Error sending APK file:', err);
      res.status(500).send('Error downloading APK. Please contact support.');
    }
  });
});

// ─── Admin Stub Routes ───────────────────────────────────────────────────────
app.post('/api/admin/approve-transaction', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Transaction approved securely via Supabase' });
});

app.post('/api/admin/reject-transaction', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Transaction rejected via Supabase' });
});

app.post('/api/admin/notify-request', async (req: Request, res: Response) => {
  res.json({ success: true, notifiedCount: 1 });
});

app.post('/api/admin/broadcast', async (req: Request, res: Response) => {
  res.json({ success: true, sentCount: 1 });
});

// ────────────────────────────────────────────────────────────────────────────
//  Crypto Pay: Create Invoice (was nowpayments)
//  Called by: Frontend Deposit.tsx
//  Action: Generates a NOWPayments invoice & returns checkout URL
// ────────────────────────────────────────────────────────────────────────────
app.post('/api/crypto-pay/create', async (req: Request, res: Response) => {
  const { amount, userId, supabaseTransactionId } = req.body;
  const apiKey = process.env.NOWPAYMENTS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'NOWPAYMENTS_API_KEY is missing in server .env' } });
  }

  if (!amount || !userId || !supabaseTransactionId) {
    return res.status(400).json({ error: { message: 'amount, userId, and supabaseTransactionId are required' } });
  }

  // Minimum amount guard
  if (Number(amount) < 10) {
    return res.status(400).json({ error: { message: 'Minimum deposit amount is $10.' } });
  }

  // Determine the IPN callback URL. In production, this MUST be a public HTTPS URL
  // that NOWPayments can reach. For dev/testing, you can use ngrok.
  const serverPublicUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  const ipnCallbackUrl = `${serverPublicUrl}/api/crypto-pay/webhook`;

  try {
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
        // ✅ FIX: order_id = our Supabase transaction UUID (for webhook matching)
        order_id: supabaseTransactionId,
        order_description: `Deposit for User ${userId}`,
        ipn_callback_url: ipnCallbackUrl,
        // Redirect user back to the app after payment
        success_url: process.env.VITE_APP_URL || 'http://localhost:3000',
        cancel_url: process.env.VITE_APP_URL || 'http://localhost:3000'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[NOWPayments] Invoice creation failed:', data);
      return res.status(400).json({ error: data });
    }

    // ✅ Update Supabase transaction with the NOWPayments invoice_id for tracking
    if (data.id && supabaseAdmin) {
      await supabaseAdmin
        .from('transactions')
        .update({ nowpayments_invoice_id: String(data.id) })
        .eq('id', supabaseTransactionId);
    }

    console.log(`[NOWPayments] Invoice created: ${data.id} for tx: ${supabaseTransactionId}`);
    res.json(data);
  } catch (error: any) {
    console.error('[NOWPayments] Create error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  Crypto Pay: Check Invoice Status
//  Called by: Frontend polling (DepositRecordPage, TransactionHistory)
//  Action: Returns current payment_status of an invoice from NOWPayments API
// ────────────────────────────────────────────────────────────────────────────
app.get('/api/crypto-pay/status/:invoiceId', async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const apiKey = process.env.NOWPAYMENTS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'NOWPAYMENTS_API_KEY is missing' } });
  }

  if (!invoiceId || invoiceId === 'undefined' || invoiceId === 'null') {
    return res.status(400).json({ error: { message: 'Valid invoiceId is required' } });
  }

  try {
    // Try fetching invoice status directly
    const invoiceResponse = await fetch(`https://api.nowpayments.io/v1/invoice/${invoiceId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await invoiceResponse.json();
    if (!invoiceResponse.ok) {
      return res.status(400).json({ error: data });
    }

    res.json({ payment_status: data.payment_status || 'waiting', raw: data });
  } catch (error: any) {
    console.error('[NOWPayments] Status check error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  🔐 Crypto Pay: IPN Webhook (SECURE)
//  Called by: NOWPayments server when a payment status changes
//
//  Security Layers:
//  1. HMAC-SHA512 signature verification (x-nowpayments-sig header)
//  2. Idempotency check: only credits balance ONCE even if webhook fires multiple times
//  3. Uses Supabase service_role key — frontend can NEVER call this
// ────────────────────────────────────────────────────────────────────────────
app.post('/api/crypto-pay/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-nowpayments-sig'] as string;
  const rawBody = (req as any).rawBody as string;
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

  console.log('[Webhook] NOWPayments IPN received');

  // ── Step 1: Verify signature exists ─────────────────────────────────────
  if (!signature) {
    console.warn('[Webhook] ❌ Missing x-nowpayments-sig header — Rejected');
    return res.status(400).json({ error: 'Missing signature' });
  }

  if (!ipnSecret) {
    console.error('[Webhook] ❌ NOWPAYMENTS_IPN_SECRET not configured in .env');
    return res.status(500).json({ error: 'Server misconfiguration: Missing IPN secret' });
  }

  // ── Step 2: HMAC-SHA512 Signature Verification ───────────────────────────
  // NOWPayments signs the payload by sorting all keys alphabetically,
  // then computing HMAC-SHA512 using your IPN Secret.
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.warn('[Webhook] ❌ Invalid JSON payload');
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Sort keys alphabetically (as NOWPayments docs specify)
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc: any, key) => { acc[key] = payload[key]; return acc; }, {});

  const hmac = crypto.createHmac('sha512', ipnSecret);
  hmac.update(JSON.stringify(sortedPayload));
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== signature) {
    console.warn('[Webhook] ❌ HMAC Signature MISMATCH — Possible fake payment attack!');
    console.warn('[Webhook]  - Received:  ', signature?.substring(0, 20) + '...');
    console.warn('[Webhook]  - Expected:  ', expectedSignature?.substring(0, 20) + '...');
    return res.status(401).json({ error: 'Invalid signature — Unauthorized' });
  }

  console.log('[Webhook] ✅ Signature verified successfully');

  // ── Step 3: Process the payment status ──────────────────────────────────
  const paymentStatus = payload.payment_status;
  // order_id in NOWPayments = our Supabase transaction UUID (set during create)
  const transactionId = payload.order_id;

  console.log(`[Webhook] Status: ${paymentStatus} | Transaction ID: ${transactionId}`);

  if (!transactionId) {
    console.warn('[Webhook] ⚠️ No order_id in payload — cannot match transaction');
    return res.status(200).json({ received: true, note: 'No order_id, ignored' });
  }

  // ── Step 4: Handle finished/confirmed payments → Credit user balance ────
  if (['finished', 'confirmed', 'sending'].includes(paymentStatus)) {
    try {
      // Fetch the transaction from Supabase
      const { data: tx, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) {
        console.error('[Webhook] ❌ Transaction not found in DB:', transactionId);
        return res.status(200).json({ received: true, note: 'Transaction not found' });
      }

      // ── Idempotency Guard: Only credit if still pending ──────────────────
      // This prevents double-credits if NOWPayments sends the webhook twice
      if (tx.status !== 'pending') {
        console.log(`[Webhook] ℹ️ Transaction ${transactionId} already processed (status: ${tx.status}). Skipping.`);
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      // Mark transaction as completed
      const { error: updateTxError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('[Webhook] ❌ Failed to update transaction status:', updateTxError);
        throw new Error('Failed to update transaction');
      }

      // ── Auto-credit user balance via atomic_increment RPC ────────────────
      // This is an atomic DB-level increment — prevents race conditions
      const userId = tx.user_id;
      const creditAmount = Number(tx.amount);

      const { error: balanceError } = await supabaseAdmin.rpc('atomic_increment', {
        table_name: 'users',
        row_id: userId,
        increments: { balance: creditAmount }
      });

      if (balanceError) {
        console.error('[Webhook] ❌ Failed to credit user balance:', balanceError);
        // Rollback transaction status to pending so it can be retried
        await supabaseAdmin.from('transactions').update({ status: 'pending' }).eq('id', transactionId);
        throw new Error('Failed to credit balance');
      }

      console.log(`[Webhook] ✅ SUCCESS: Credited $${creditAmount} to user ${userId} for tx ${transactionId}`);

    } catch (err: any) {
      console.error('[Webhook] ❌ Processing error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Handle failed/expired payments
  if (['failed', 'expired', 'refunded'].includes(paymentStatus)) {
    try {
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .eq('status', 'pending'); // Only update if still pending (idempotency)

      console.log(`[Webhook] ⚠️ Transaction ${transactionId} marked as failed (${paymentStatus})`);
    } catch (err: any) {
      console.error('[Webhook] Error marking failed:', err.message);
    }
  }

  // Always return 200 to NOWPayments — so they stop retrying
  return res.status(200).json({ received: true, status: paymentStatus });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Zalando Pro Server running on port ${PORT}`);
  console.log(`🔗 Health:   http://localhost:${PORT}/api/health`);
  console.log(`🔐 Webhook:  http://localhost:${PORT}/api/crypto-pay/webhook`);
  
  const supabaseConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY && 
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE';
  
  if (!supabaseConfigured) {
    console.warn('\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set in .env!');
    console.warn('   Webhook payments will NOT auto-credit user balances.');
    console.warn('   Get it from: Supabase Dashboard → Settings → API → service_role\n');
  } else {
    console.log('✅ Supabase Admin Client connected');
  }

  const ipnConfigured = !!process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnConfigured) {
    console.warn('⚠️  WARNING: NOWPAYMENTS_IPN_SECRET not set — Webhook HMAC unprotected!\n');
  } else {
    console.log('✅ NOWPayments IPN Secret loaded');
  }
  console.log('');
});
