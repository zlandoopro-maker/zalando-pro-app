interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const deviceTimeMs = Number(url.searchParams.get('deviceTimeMs') ?? url.searchParams.get('deviceTime') ?? url.searchParams.get('t') ?? Date.now());
  const userId = url.searchParams.get('userId');
  const serverTimeMs = Date.now();
  const driftMs = Math.abs(serverTimeMs - deviceTimeMs);

  // Safe server clock endpoint: returns server time, never auto-blocks users in DB
  return new Response(JSON.stringify({
    ok: true,
    blocked: false,
    warning: false,
    deviceTimeMs,
    serverTimeMs,
    driftMs,
    userId
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
};
