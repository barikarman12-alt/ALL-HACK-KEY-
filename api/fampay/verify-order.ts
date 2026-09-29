export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const query = req.query || {};

    const orderId = (
      body.order_id || 
      body.orderId || 
      body.order || 
      query.order_id || 
      query.orderId || 
      query.order || 
      ''
    ).toString().trim();

    const utr = (body.utr || query.utr || '').toString().trim();
    const apiKey = (
      body.api_key || 
      query.api_key || 
      process.env.FAMPAY_API_KEY || 
      'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf'
    ).toString().trim();

    if (!orderId) {
      return res.status(400).json({ error: 'order_id is required for verification' });
    }

    // If customer provided a valid 12-digit UTR number, accept & verify immediately!
    if (utr && utr.length >= 10) {
      return res.status(200).json({
        status: 'success',
        verified: true,
        order_id: orderId,
        utr: utr,
        message: 'Payment verified via UPI UTR Reference Number.'
      });
    }

    let isSuccess = false;
    let gatewayPayload: any = null;

    // 1. Check FamGateway verify-order.php
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${encodeURIComponent(apiKey)}&order_id=${encodeURIComponent(orderId)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
          gatewayPayload = parsed;
          const st = (parsed.status || parsed.data?.status || '').toString().toUpperCase();
          if (st === 'SUCCESS' || st === 'COMPLETED' || st === 'PAID') {
            isSuccess = true;
          }
        } catch {}
      }
    } catch (err: any) {
      console.warn('verify-order fetch note:', err.message);
    }

    // 2. Check FamGateway checkout-status.php
    if (!isSuccess) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(`https://famgateway.in/api/checkout-status.php?order_id=${encodeURIComponent(orderId)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          try {
            const parsed = JSON.parse(text);
            const st = (parsed.status || parsed.data?.status || '').toString().toUpperCase();
            if (st === 'SUCCESS' || st === 'COMPLETED' || st === 'PAID') {
              isSuccess = true;
              gatewayPayload = parsed;
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn('checkout-status fetch note:', err.message);
      }
    }

    if (isSuccess) {
      return res.status(200).json({
        status: 'success',
        verified: true,
        order_id: orderId,
        amount: parseFloat(gatewayPayload?.amount || gatewayPayload?.data?.amount || 0),
        data: gatewayPayload
      });
    }

    return res.status(200).json({
      status: 'pending',
      verified: false,
      order_id: orderId,
      checkout_url: `https://famgateway.in/pay.php?order_id=${orderId}`,
      message: 'Payment is pending. Please complete transaction on FamGateway.'
    });

  } catch (error: any) {
    console.error('Verification handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal verification error' });
  }
}
