import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
const envText = fs.readFileSync('.env', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  env[key] = value;
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('No Supabase service-role credentials found in .env; cleanup skipped.');
  process.exit(0);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data, error } = await supabase
  .from('users')
  .select('id,is_blocked,isBlocked,block_reason,ban_reason,updated_at,updatedAt')
  .or('is_blocked.eq.true,isBlocked.eq.true');

if (error) {
  throw error;
}

const stale = (data || []).filter((row) => {
  const reason = String(row.block_reason ?? row.ban_reason ?? '').toLowerCase();
  if (!reason.includes('time tampering') && !reason.includes('clock drift')) return false;
  const ts = row.updated_at ?? row.updatedAt ?? '';
  return !ts || new Date(ts).getTime() < new Date(cutoff).getTime();
});

console.log(`Found ${stale.length} stale auto-block records to clear.`);
let cleared = 0;

for (const row of stale) {
  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_blocked: false,
      isBlocked: false,
      block_reason: null,
      ban_reason: null,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (updateError) {
    console.error('Failed to clear stale block for user', row.id, updateError.message);
  } else {
    cleared += 1;
  }
}

console.log(`Cleanup complete. Cleared ${cleared} stale auto-block records.`);
