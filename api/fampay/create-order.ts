export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      amount,
      product_name,
      duration_label,
      quantity = 1,
      user_id,
      user_email,
      coupon_code,
      custom_redirect_url,
      api_key
    } = body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const apiKey = (api_key && api_key.trim()) || process.env.FAMPAY_API_KEY || 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const clientOrderId = `fg_${randomSuffix}`;

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;
    const verifyRedirectUrl = custom_redirect_url || `${origin}/verify-payment`;
    const webhookUrl = `${origin}/api/fampay/webhook`;

    let checkoutUrl = '';
    let gatewayOrderId = clientOrderId;
    let upiIntent = `upi://pay?pa=fatherxsir@upi&pn=Arman%20X%20Store&am=${parseFloat(amount).toFixed(2)}&cu=INR&tr=${clientOrderId}&tn=Order%20${clientOrderId}`;
    let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntent)}`;

    // Call FamGateway create-order API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch('https://famgateway.in/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          api_key: apiKey,
          amount: parseFloat(amount).toFixed(2),
          order_id: clientOrderId,
          redirect_url: verifyRedirectUrl,
          webhook_url: webhookUrl,
          customer_name: user_email ? user_email.split('@')[0] : 'Customer',
          customer_email: user_email || 'customer@gmail.com'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      try {
        const gatewayData = JSON.parse(text);
        if (gatewayData?.status === 'success' && gatewayData?.data) {
          checkoutUrl = gatewayData.data.checkout_url || `https://famgateway.in/pay.php?order_id=${gatewayData.data.order_id}`;
          gatewayOrderId = gatewayData.data.order_id || clientOrderId;
          if (gatewayData.data.upi_intent) upiIntent = gatewayData.data.upi_intent;
          if (gatewayData.data.qr_url) qrUrl = gatewayData.data.qr_url;
        } else if (gatewayData?.checkout_url) {
          checkoutUrl = gatewayData.checkout_url;
          gatewayOrderId = gatewayData.order_id || clientOrderId;
        }
      } catch {}
    } catch (err: any) {
      console.warn('Vercel order create note:', err.message);
    }

    if (!checkoutUrl) {
      checkoutUrl = `https://famgateway.in/pay.php?order_id=${gatewayOrderId}`;
    }

    return res.status(200).json({
      success: true,
      order_id: gatewayOrderId,
      amount: parseFloat(amount),
      checkout_url: checkoutUrl,
      upi_intent: upiIntent,
      qr_url: qrUrl,
      redirect_url: `${origin}/verify-payment?order_id=${gatewayOrderId}`,
      message: 'Order created successfully.'
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return res.status(500).json({ error: error.message || 'Payment initiation failed' });
  }
}
