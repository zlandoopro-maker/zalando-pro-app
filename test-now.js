const fetch = require('node-fetch') || globalThis.fetch;
(async () => {
  const res = await fetch('http://localhost:5000/api/nowpayments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 50, userId: "test" })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
