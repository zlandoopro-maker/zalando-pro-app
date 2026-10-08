const fetch = require('node-fetch') || globalThis.fetch;

(async () => {
  const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NodeTest'
    },
    body: JSON.stringify({
      price_amount: 50,
      price_currency: 'usd',
      order_id: 'test_order',
      order_description: 'test'
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
})();
