export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Zalando Pro API (Cloudflare Pages Functions)'
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
};
