export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const orderId = (req.query?.order_id || req.body?.order_id || '').toString().trim();
  if (!orderId) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  return res.status(200).json({
    success: true,
    orderId,
    message: 'Order endpoint ready'
  });
}
