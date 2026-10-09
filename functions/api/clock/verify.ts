interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const deviceTimeMs = Number(url.searchParams.get('deviceTimeMs') ?? url.searchParams.get('deviceTime') ?? url.searchParams.get('t') ?? NaN);
  const userId = url.searchParams.get('userId');
  const serverTimeMs = Date.now();
  const maxAllowedDriftMs = 4 * 60 * 60 * 1000;
  const severeDriftMs = 12 * 60 * 60 * 1000;

  if (!Number.isFinite(deviceTimeMs)) {
    return new Response(JSON.stringify({ ok: false, error: 'deviceTimeMs is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const driftMs = Math.abs(serverTimeMs - deviceTimeMs);
  const shouldWarn = driftMs > maxAllowedDriftMs;
  const shouldBlock = driftMs > maxAllowedDriftMs && driftMs >= severeDriftMs;

  if (userId && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const existing = await fetch(
        `${env.SUPABASE_URL}/rest/v1/users?select=is_blocked,isBlocked,block_reason,ban_reason&id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rows = await existing.json();
      const userRow = Array.isArray(rows) ? rows[0] : null;
      const blockReason = String(userRow?.block_reason ?? userRow?.ban_reason ?? '').trim();
      const existingBlock = Boolean(userRow?.is_blocked === true || userRow?.isBlocked === true || blockReason.length > 0);

      if (existingBlock) {
        return new Response(JSON.stringify({
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
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        });
      }
    } catch (error) {
      console.warn('Cloudflare clock verify existing-block lookup failed:', error);
    }
  }

  if (shouldBlock && userId && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await fetch(`${env.SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          is_blocked: true,
          isBlocked: true,
          block_reason: `Server-side clock drift detected: ${driftMs}ms`,
          ban_reason: `Server-side clock drift detected: ${driftMs}ms`,
          updated_at: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Cloudflare clock verify block failed:', error);
    }
  }

  return new Response(JSON.stringify({
    ok: !shouldBlock,
    blocked: shouldBlock,
    warning: shouldWarn && !shouldBlock,
    deviceTimeMs,
    serverTimeMs,
    driftMs,
    maxAllowedDriftMs,
    severeDriftMs,
    userId
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
};
