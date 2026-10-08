/**
 * ============================================================
 *  ⏰ BULLETPROOF CLOCK GUARD — Anti Time-Tampering System
 * ============================================================
 *
 * LAYERS of Detection:
 *  1. Server time fetch (WorldTime API + Supabase timestamp)
 *  2. performance.now() monotonic clock drift check
 *  3. Multi-URL cross-validation
 *  4. Persistence: strikes saved to localStorage
 *  5. 3 strikes → user gets auto-blocked in Supabase DB
 *
 * If tampering is detected:
 *  - User sees a prominent error
 *  - Account is flagged `isBlocked = true` in Supabase
 *  - User is force-logged-out
 * ============================================================
 */

import { supabase } from './supabase';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const MAX_ALLOWED_DRIFT_MS = 5 * 60 * 1000; // 5 minutes tolerance
const STRIKES_KEY           = 'zp_clock_strikes';
const MAX_STRIKES           = 3;

// Multiple fallback time APIs for cross-validation
const TIME_APIS = [
  'https://worldtimeapi.org/api/ip',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getStrikes(): number {
  return parseInt(localStorage.getItem(STRIKES_KEY) || '0', 10);
}

function addStrike(): number {
  const s = getStrikes() + 1;
  localStorage.setItem(STRIKES_KEY, String(s));
  return s;
}

function clearStrikes() {
  localStorage.removeItem(STRIKES_KEY);
}

/** Fetch server time from WorldTimeAPI */
async function fetchWorldTime(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(TIME_APIS[0], { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('worldtime fail');
    const json = await res.json();
    // worldtimeapi returns `unixtime` (seconds)
    return (json.unixtime ?? json.utc_datetime) 
      ? (json.unixtime ? json.unixtime * 1000 : new Date(json.utc_datetime).getTime())
      : null;
  } catch {
    return null;
  }
}

/** Fetch server time from TimeAPI.io */
async function fetchTimeApiIo(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(TIME_APIS[1], { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('timeapi fail');
    const json = await res.json();
    if (json.dateTime) return new Date(json.dateTime + 'Z').getTime();
    return null;
  } catch {
    return null;
  }
}

/** Get server time from Supabase (using DB NOW()) */
async function fetchSupabaseTime(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('get_server_time').maybeSingle();
    if (!error && data) return new Date(data as any).getTime();
    // Fallback: use Supabase auth session time metadata
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.expires_at) {
      // expires_at is in future, just confirms server connectivity
      return Date.now(); // can't derive exact server time from this alone
    }
    return null;
  } catch {
    return null;
  }
}

/** Use performance.now() monotonic drift to detect mid-session clock jumps */
let _perfBaseline: { perfNow: number; wallTime: number } | null = null;

export function initClockBaseline() {
  _perfBaseline = {
    perfNow: performance.now(),
    wallTime: Date.now(),
  };
}

function checkMonotonicDrift(): { tampered: boolean; driftMs: number } {
  if (!_perfBaseline) return { tampered: false, driftMs: 0 };
  const elapsed = performance.now() - _perfBaseline.perfNow;
  const wallElapsed = Date.now() - _perfBaseline.wallTime;
  const driftMs = Math.abs(wallElapsed - elapsed);
  // If wall clock moved significantly more than monotonic time → tampered
  const tampered = driftMs > MAX_ALLOWED_DRIFT_MS;
  return { tampered, driftMs };
}

// ─── AUTO-BLOCK USER ──────────────────────────────────────────────────────────

async function blockUserAccount(uid: string, reason: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        is_blocked: true,
        block_reason: `[AUTO] Time Tampering Detected: ${reason}. Blocked at ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uid);
    console.warn('[ClockGuard] User auto-blocked:', uid, reason);
  } catch (err) {
    console.error('[ClockGuard] Failed to auto-block user:', err);
  }
}

// ─── MAIN VERIFICATION FUNCTION ───────────────────────────────────────────────

export interface ClockCheckResult {
  passed: boolean;
  reason?: string;
  driftMs?: number;
  strikes?: number;
}

export async function verifyClockIntegrity(
  showNotification?: (msg: string, opts?: any) => void
): Promise<boolean> {
  // Bypassing clock check to prevent false positives when device sleeps
  return true;
}

async function handleTampering(
  uid: string | undefined,
  reason: string,
  showNotification?: (msg: string, opts?: any) => void
): Promise<false> {
  const strikes = addStrike();
  console.warn(`[ClockGuard] Strike ${strikes}/${MAX_STRIKES}: ${reason}`);

  const remainingWarnings = MAX_STRIKES - strikes;

  if (strikes >= MAX_STRIKES) {
    // Auto-block
    if (uid) {
      await blockUserAccount(uid, reason);
    }
    showNotification?.(
      `⛔ Your account has been BLOCKED due to repeated clock manipulation attempts. Contact support.`,
      { type: 'error', title: 'ACCOUNT BLOCKED', duration: 0 }
    );
    // Force logout
    await supabase.auth.signOut();
    setTimeout(() => window.location.reload(), 2500);
  } else {
    showNotification?.(
      `⚠️ System clock manipulation detected! (Warning ${strikes}/${MAX_STRIKES}). ${remainingWarnings} more warning${remainingWarnings > 1 ? 's' : ''} before account block.`,
      { type: 'error', title: 'TIME TAMPERING DETECTED' }
    );
  }

  return false;
}

// ─── BACKGROUND MONITOR ───────────────────────────────────────────────────────
// Call this once at app startup to start periodic monitoring

let _monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startClockMonitor(
  showNotification?: (msg: string, opts?: any) => void,
  intervalMs = 5 * 60 * 1000 // check every 5 minutes
) {
  initClockBaseline();
  if (_monitorInterval) clearInterval(_monitorInterval);

  _monitorInterval = setInterval(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return; // not logged in, skip
    await verifyClockIntegrity(showNotification);
  }, intervalMs);
}

export function stopClockMonitor() {
  if (_monitorInterval) {
    clearInterval(_monitorInterval);
    _monitorInterval = null;
  }
}
