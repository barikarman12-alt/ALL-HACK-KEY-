const apiKey = 'fam_e69d7429a324e9114b13dbb98f69cd4f0133a605';
const order_id = 'fg_FXA7Z2AT';
fetch(`https://famgateway.in/api/verify-order.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ api_key: apiKey, order_id: order_id })
}).then(r => r.text()).then(console.log);
