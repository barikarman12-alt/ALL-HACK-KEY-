import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface StoredOrder {
  order_id: string;
  client_txn_id?: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  product_name?: string;
  duration_label?: string;
  duration_value?: string;
  quantity?: number;
  user_id?: string;
  user_email?: string;
  coupon_code?: string;
  checkout_url?: string;
  upi_intent?: string;
  qr_url?: string;
  created_at: string;
  paid_at?: string;
  gateway_response?: any;
}

const orders: Record<string, StoredOrder> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  /**
   * 1. CREATE FRESH ORDER ON FAMGATEWAY
   * Always registers the order on FamGateway so checkout page never shows "Order not found"
   */
  app.post(['/api/fampay/create-order', '/api/payment/create-order'], async (req, res) => {
    try {
      const { 
        amount, 
        product_name, 
        duration_label, 
        duration_value, 
        quantity = 1, 
        user_id, 
        user_email, 
        coupon_code,
        custom_redirect_url
      } = req.body;

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }

      const apiKey = process.env.FAMPAY_API_KEY || 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const clientOrderId = `fg_${randomSuffix}`;

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const verifyRedirectUrl = custom_redirect_url || `${origin}/verify-payment`;
      const webhookUrl = `${origin}/api/fampay/webhook`;

      let gatewayData: any = null;
      let checkoutUrl = '';
      let gatewayOrderId = clientOrderId;
      let upiIntent = '';
      let qrUrl = '';

      // Call FamGateway create-order API
      let success = false;
      let lastError = '';

      // Try create-order
      for (let attempt = 1; attempt <= 2 && !success; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

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
            gatewayData = JSON.parse(text);
            if (gatewayData?.status === 'success' && gatewayData?.data) {
              checkoutUrl = gatewayData.data.checkout_url || `https://famgateway.in/pay.php?order_id=${gatewayData.data.order_id}`;
              gatewayOrderId = gatewayData.data.order_id || clientOrderId;
              upiIntent = gatewayData.data.upi_intent || '';
              qrUrl = gatewayData.data.qr_url || '';
              success = true;
            } else if (gatewayData?.checkout_url) {
              checkoutUrl = gatewayData.checkout_url;
              success = true;
            } else {
              lastError = gatewayData?.message || 'FamGateway rejected order payload';
            }
          } catch {
            lastError = 'Invalid JSON from FamGateway';
          }
        } catch (err: any) {
          lastError = err.message || 'Connection timeout';
        }
      }

      if (!success || !checkoutUrl) {
        console.error('FamGateway order creation failure:', lastError);
        return res.status(502).json({
          error: 'Failed to create active order on FamGateway. Please check API Key or try again.',
          details: lastError
        });
      }

      // Record order in server store
      orders[gatewayOrderId] = {
        order_id: gatewayOrderId,
        client_txn_id: clientOrderId,
        amount: parseFloat(amount),
        status: 'PENDING',
        product_name,
        duration_label,
        duration_value,
        quantity: Number(quantity) || 1,
        user_id,
        user_email,
        coupon_code,
        checkout_url: checkoutUrl,
        upi_intent: upiIntent,
        qr_url: qrUrl,
        created_at: new Date().toISOString(),
        gateway_response: gatewayData
      };

      console.log(`[Order Created Successfully] Order ID: ${gatewayOrderId} | Amount: ₹${amount} | URL: ${checkoutUrl}`);

      return res.json({
        success: true,
        order_id: gatewayOrderId,
        amount: parseFloat(amount),
        checkout_url: checkoutUrl,
        upi_intent: upiIntent,
        qr_url: qrUrl,
        redirect_url: `${origin}/verify-payment?order_id=${gatewayOrderId}`,
        message: 'Order created successfully on FamGateway.'
      });
    } catch (error: any) {
      console.error('Payment order creation error:', error);
      res.status(500).json({ error: error.message || 'Payment initiation failed' });
    }
  });

  /**
   * 2. VERIFY PAYMENT STATUS FROM FAMGATEWAY
   */
  app.post(['/api/fampay/verify-order', '/api/payment/verify-order'], async (req, res) => {
    try {
      const { order_id } = req.body;
      const apiKey = process.env.FAMPAY_API_KEY || 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';

      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required for verification' });
      }

      const stored = orders[order_id];
      if (stored && stored.status === 'SUCCESS') {
        return res.json({
          status: 'success',
          verified: true,
          order_id,
          amount: stored.amount,
          paid_at: stored.paid_at,
          data: stored
        });
      }

      let isSuccess = false;
      let gatewayPayload: any = null;

      // 1. Check FamGateway verify-order.php
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${encodeURIComponent(order_id)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          try {
            gatewayPayload = JSON.parse(text);
            const st = (gatewayPayload.status || gatewayPayload.data?.status || '').toString().toLowerCase();
            if (st === 'success' || st === 'paid' || st === 'completed') {
              isSuccess = true;
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn('verify-order check notice:', err.message);
      }

      // 2. Check FamGateway checkout-status.php if not yet confirmed
      if (!isSuccess) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(`https://famgateway.in/api/checkout-status.php?order_id=${encodeURIComponent(order_id)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            try {
              const statusData = JSON.parse(text);
              const st = (statusData.status || statusData.data?.status || '').toString().toLowerCase();
              if (st === 'success' || st === 'paid' || st === 'completed') {
                isSuccess = true;
                gatewayPayload = statusData;
              }
            } catch {}
          }
        } catch (err: any) {
          console.warn('checkout-status check notice:', err.message);
        }
      }

      if (isSuccess) {
        if (stored) {
          stored.status = 'SUCCESS';
          stored.paid_at = new Date().toISOString();
        }
        return res.json({
          status: 'success',
          verified: true,
          order_id,
          amount: stored?.amount || gatewayPayload?.amount || gatewayPayload?.data?.amount,
          data: stored || gatewayPayload
        });
      }

      return res.json({
        status: 'pending',
        verified: false,
        order_id,
        checkout_url: stored?.checkout_url || `https://famgateway.in/pay.php?order_id=${order_id}`,
        message: 'Payment is pending. Please complete your transaction in UPI app.'
      });
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: error.message || 'Verification request failed' });
    }
  });

  /**
   * 3. GATEWAY WEBHOOK
   */
  app.post(['/api/fampay/webhook', '/api/payment/webhook'], (req, res) => {
    try {
      const payload = req.body || {};
      const { order_id, status, amount } = payload;
      console.log(`[Webhook Received] Order: ${order_id}, Status: ${status}, Amount: ${amount}`);

      if (order_id) {
        const isSuccess = (status === 'success' || status === 'PAID' || status === 'SUCCESS');
        if (orders[order_id]) {
          orders[order_id].status = isSuccess ? 'SUCCESS' : 'FAILED';
          if (isSuccess) orders[order_id].paid_at = new Date().toISOString();
        } else {
          orders[order_id] = {
            order_id,
            amount: parseFloat(amount) || 0,
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            created_at: new Date().toISOString(),
            paid_at: isSuccess ? new Date().toISOString() : undefined
          };
        }
      }

      res.status(200).json({ success: true, message: 'Webhook received' });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
