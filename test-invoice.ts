import dotenv from 'dotenv';
dotenv.config();
(async () => {
  const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY || 'S3ZNPCF-Q1HMRJS-NWCXK3N-B7W1PHN',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ZalandoProServer/1.0'
    },
    body: JSON.stringify({
      price_amount: 50,
      price_currency: 'usd',
      order_id: 'test_order',
      order_description: 'test',
      success_url: 'http://localhost:3000',
      cancel_url: 'http://localhost:3000'
    })
  });
  const data = await response.json();
  console.log("INVOICE RESPONSE:", JSON.stringify(data, null, 2));
})();
