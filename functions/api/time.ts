export const onRequestGet: PagesFunction = async () => {
  const now = Date.now();

  return new Response(JSON.stringify({
    ok: true,
    datetime: new Date(now).toISOString(),
    iso: new Date(now).toISOString(),
    unixMs: now,
    serverTimeMs: now,
    timestamp: new Date(now).toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
};
