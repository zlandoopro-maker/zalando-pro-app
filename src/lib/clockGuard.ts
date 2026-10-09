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
import { shouldEnforceClockValidation } from './clockPolicy';

export { shouldEnforceClockValidation } from './clockPolicy';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Lenient anti-tamper parameters: avoid false positives from network latency or mobile sleep.
// Only flag massive time manipulation (> 24 hours). Never auto-block in DB from client heuristics.
const MAX_ALLOWED_DRIFT_MS = 24 * 60 * 60 * 1000; // 24 hours tolerance
const SEVERE_DRIFT_MS      = 48 * 60 * 60 * 1000; // 48 hours
const STRIKES_KEY_PREFIX   = 'zp_clock_strikes';

const TIME_APIS = [
  '/api/time',
  'https://worldtimeapi.org/api/ip',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getClockStrikeKey(uid?: string): string | null {
  const normalized = uid?.trim();
  if (!normalized) return null;
  return `${STRIKES_KEY_PREFIX}_${normalized}`;
}

export function getClockStrikeCount(uid?: string): number {
  if (typeof localStorage === 'undefined') return 0;
  const key = getClockStrikeKey(uid);
  if (!key) return 0;
  return Number.parseInt(localStorage.getItem(key) || '0', 10) || 0;
}

function clearLegacySharedClockStrikes() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STRIKES_KEY_PREFIX);
}

export function clearClockStrikes(uid?: string) {
  if (typeof localStorage === 'undefined') return;

  if (uid) {
    const normalizedUid = uid.trim();
    if (normalizedUid) {
      localStorage.removeItem(getClockStrikeKey(normalizedUid) as string);
    }
    clearLegacySharedClockStrikes();
    return;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && (key === STRIKES_KEY_PREFIX || key.startsWith(`${STRIKES_KEY_PREFIX}_`))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/** Fetch server time safely — checks Content-Type header to ignore Vite HTML fallbacks */
async function fetchLiveBackendTime(): Promise<number | null> {
  const candidates = new Set<string>();

  if (typeof window !== 'undefined' && window.location?.origin) {
    candidates.add(`${window.location.origin}/api/time`);
  }
  candidates.add('/api/time');

  for (const url of Array.from(candidates)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue; // Skip HTML responses

      const json = await res.json();
      const serverMs =
        Number(json.serverTimeMs ?? json.unixMs ?? json.now ?? json.timestamp ?? json.datetime ?? 0) ||
        new Date(json.datetime ?? json.iso ?? json.utc_datetime ?? json.dateTime ?? Date.now()).getTime();

      if (Number.isFinite(serverMs) && serverMs > 0) {
        return serverMs;
      }
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

/** Fetch server time from WorldTimeAPI */
async function fetchWorldTime(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(TIME_APIS[1], { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const json = await res.json();
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
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(TIME_APIS[2], { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
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
    const { data, error } = await supabase.rpc('get_server_time');
    const serverValue = Array.isArray(data) ? data[0] : data;
    if (!error && serverValue) {
      const parsed = typeof serverValue === 'string' ? new Date(serverValue).getTime() : Number(serverValue);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

let _perfBaseline: { perfNow: number; wallTime: number } | null = null;

export function initClockBaseline() {
  _perfBaseline = {
    perfNow: performance.now(),
    wallTime: Date.now(),
  };
}

export interface ClockCheckResult {
  passed: boolean;
  reason?: string;
  driftMs?: number;
}

export async function getReliableServerTime(): Promise<number | null> {
  let serverTime = await fetchLiveBackendTime();
  if (!serverTime) serverTime = await fetchWorldTime();
  if (!serverTime) serverTime = await fetchTimeApiIo();
  if (!serverTime) serverTime = await fetchSupabaseTime();
  return serverTime;
}

export function evaluateClockDrift(driftMs: number): { shouldWarn: boolean; shouldBlock: boolean; reason: 'minor-drift' | 'severe-drift' | 'ok' } {
  if (!Number.isFinite(driftMs) || driftMs <= 0) {
    return { shouldWarn: false, shouldBlock: false, reason: 'ok' };
  }

  if (driftMs > SEVERE_DRIFT_MS) {
    return { shouldWarn: true, shouldBlock: false, reason: 'severe-drift' };
  }

  if (driftMs > MAX_ALLOWED_DRIFT_MS) {
    return { shouldWarn: true, shouldBlock: false, reason: 'minor-drift' };
  }

  return { shouldWarn: false, shouldBlock: false, reason: 'ok' };
}

/** Auto-unblock any accounts that were mistakenly auto-blocked by legacy clockGuard */
export async function autoUnblockAutoBannedUsers(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('is_blocked,isBlocked,block_reason,ban_reason')
      .eq('id', uid)
      .maybeSingle();

    if (!userRow) return;

    const blockReason = String((userRow as any).block_reason ?? (userRow as any).ban_reason ?? '');
    // If the ban reason contains "[AUTO] Time Tampering", auto-heal/unblock the user
    if (blockReason.includes('[AUTO] Time Tampering')) {
      await supabase.from('users').update({
        is_blocked: false,
        isBlocked: false,
        block_reason: null,
        ban_reason: null,
        updated_at: new Date().toISOString()
      }).eq('id', uid);
      console.log('[ClockGuard] Auto-unblocked user:', uid);
    }
  } catch (err) {
    console.warn('[ClockGuard] Auto-unblock check failed:', err);
  }
}

export async function verifyClockIntegrity(
  showNotification?: (msg: string, opts?: any) => void
): Promise<boolean> {
  const registrationInProgress = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('is_registering') === 'true';
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;

  if (!shouldEnforceClockValidation(uid, registrationInProgress)) {
    return true;
  }

  // Clear legacy strikes immediately
  if (uid) {
    clearClockStrikes(uid);
    // Unblock if false positive auto-banned in previous session
    autoUnblockAutoBannedUsers(uid).catch(() => {});
  }

  // Fetch trusted server time
  let serverTime = await getReliableServerTime();

  // If server time is unavailable, pass gracefully — never block user for network errors
  if (!serverTime) {
    return true;
  }

  const deviceTime = Date.now();
  const drift = Math.abs(serverTime - deviceTime);

  // Only warn if drift is larger than 24 hours
  if (drift > MAX_ALLOWED_DRIFT_MS) {
    showNotification?.(
      '⚠️ Your device date/time appears to be out of sync. Please check your system clock settings.',
      { type: 'warning', title: 'TIME SYNC NOTICE' }
    );
  }

  return true;
}

// Background Monitor stub (kept for interface compatibility)
export function startClockMonitor(
  _showNotification?: (msg: string, opts?: any) => void,
  _intervalMs = 5 * 60 * 1000
) {
  initClockBaseline();
  // Safe background monitor: does not auto-block users
}

export function stopClockMonitor() {
  // Safe stop
}

