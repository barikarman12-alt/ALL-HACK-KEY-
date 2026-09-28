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

function normalizeStatus(statusRaw?: any): 'SUCCESS' | 'FAILED' | 'PENDING' {
  if (!statusRaw) return 'PENDING';
  const s = String(statusRaw).trim().toUpperCase();
  if (s === 'SUCCESS' || s === 'PAID' || s === 'COMPLETED' || s === 'TRUE' || s === '1' || s === 'TXN_SUCCESS') {
    return 'SUCCESS';
  }
  if (s === 'FAILED' || s === 'FAIL' || s === 'FAILURE' || s === 'CANCELLED' || s === 'EXPIRED') {
    return 'FAILED';
  }
  return 'PENDING';
}

function extractOrderId(body: any, query: any): string {
  return (
    body?.order_id ||
    body?.orderId ||
    body?.client_txn_id ||
    body?.txn_id ||
    body?.id ||
    body?.data?.order_id ||
    body?.data?.orderId ||
    query?.order_id ||
    query?.orderId ||
    query?.client_txn_id ||
    query?.txn_id ||
    query?.id ||
    ''
  ).toString().trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and URL-encoded forms (common for webhook callbacks)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  /**
   * 1. CREATE FRESH ORDER ON FAMGATEWAY
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
        custom_redirect_url,
        api_key
      } = req.body;

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }

      const apiKey = (api_key && api_key.trim()) || process.env.FAMPAY_API_KEY || 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const clientOrderId = `fg_${randomSuffix}`;

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const verifyRedirectUrl = custom_redirect_url || `${origin}/verify-payment`;
      const webhookUrl = `${origin}/api/fampay/webhook`;

      let gatewayData: any = null;
      let checkoutUrl = '';
      let gatewayOrderId = clientOrderId;
      let upiIntent = `upi://pay?pa=fatherxsir@upi&pn=Arman%20X%20Store&am=${parseFloat(amount).toFixed(2)}&cu=INR&tr=${clientOrderId}&tn=Order%20${clientOrderId}`;
      let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntent)}`;

      // Call FamGateway create-order API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

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
            if (gatewayData.data.upi_intent) upiIntent = gatewayData.data.upi_intent;
            if (gatewayData.data.qr_url) qrUrl = gatewayData.data.qr_url;
          } else if (gatewayData?.checkout_url) {
            checkoutUrl = gatewayData.checkout_url;
            gatewayOrderId = gatewayData.order_id || clientOrderId;
          }
        } catch {
          // fallback to default checkout URL
        }
      } catch (err: any) {
        console.warn('Direct gateway registration note:', err?.message);
      }

      if (!checkoutUrl) {
        checkoutUrl = `https://famgateway.in/pay.php?order_id=${gatewayOrderId}`;
      }

      // Record order in server store
      orders[gatewayOrderId] = {
        order_id: gatewayOrderId,
        client_txn_id: clientOrderId,
        amount: parseFloat(amount),
        status: 'PENDING',
        product_name: product_name || 'Wallet Top-up',
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

      console.log(`[Order Created] ID: ${gatewayOrderId} | Amount: ₹${amount} | URL: ${checkoutUrl}`);

      return res.json({
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
      console.error('Payment order creation error:', error);
      res.status(500).json({ error: error.message || 'Payment initiation failed' });
    }
  });

  /**
   * 2. VERIFY PAYMENT STATUS FROM FAMGATEWAY
   * Handles both POST and GET, checking memory cache, webhook records, and remote gateway APIs.
   */
  const handleVerifyOrder = async (req: express.Request, res: express.Response) => {
    try {
      const order_id = extractOrderId(req.body, req.query);
      const apiKey = (req.body?.api_key || req.query?.api_key || process.env.FAMPAY_API_KEY || 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf').toString().trim();

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
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${encodeURIComponent(order_id)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          try {
            gatewayPayload = JSON.parse(text);
            const st = normalizeStatus(gatewayPayload.status || gatewayPayload.data?.status);
            if (st === 'SUCCESS') {
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
          const timeoutId = setTimeout(() => controller.abort(), 4500);

          const response = await fetch(`https://famgateway.in/api/checkout-status.php?order_id=${encodeURIComponent(order_id)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            try {
              const statusData = JSON.parse(text);
              const st = normalizeStatus(statusData.status || statusData.data?.status);
              if (st === 'SUCCESS') {
                isSuccess = true;
                gatewayPayload = statusData;
              }
            } catch {}
          }
        } catch (err: any) {
          console.warn('checkout-status check notice:', err.message);
        }
      }

      // 3. Check FamGateway order-status API if still pending
      if (!isSuccess) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(`https://famgateway.in/api/order-status?order_id=${encodeURIComponent(order_id)}`, {
            headers: { 'x-api-key': apiKey },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            try {
              const statusData = JSON.parse(text);
              const st = normalizeStatus(statusData.status || statusData.data?.status);
              if (st === 'SUCCESS') {
                isSuccess = true;
                gatewayPayload = statusData;
              }
            } catch {}
          }
        } catch {}
      }

      if (isSuccess) {
        const paidAtTime = new Date().toISOString();
        if (stored) {
          stored.status = 'SUCCESS';
          stored.paid_at = stored.paid_at || paidAtTime;
        } else {
          orders[order_id] = {
            order_id,
            amount: parseFloat(gatewayPayload?.amount || gatewayPayload?.data?.amount || 0),
            status: 'SUCCESS',
            created_at: paidAtTime,
            paid_at: paidAtTime,
            gateway_response: gatewayPayload
          };
        }

        const effectiveData = stored || orders[order_id];

        console.log(`[Order Verified SUCCESS] Order ID: ${order_id} | Amount: ₹${effectiveData.amount}`);

        return res.json({
          status: 'success',
          verified: true,
          order_id,
          amount: effectiveData.amount || gatewayPayload?.amount || gatewayPayload?.data?.amount,
          paid_at: effectiveData.paid_at,
          data: effectiveData
        });
      }

      return res.json({
        status: 'pending',
        verified: false,
        order_id,
        checkout_url: stored?.checkout_url || `https://famgateway.in/pay.php?order_id=${order_id}`,
        message: 'Payment is pending. Please complete your transaction on the payment gateway.'
      });
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: error.message || 'Verification request failed' });
    }
  };

  app.all(['/api/fampay/verify-order', '/api/payment/verify-order'], handleVerifyOrder);

  /**
   * 3. ASYNCHRONOUS GATEWAY WEBHOOK (Handles both POST and GET)
   */
  const handleWebhook = (req: express.Request, res: express.Response) => {
    try {
      const payload = { ...req.query, ...req.body };
      const orderId = extractOrderId(req.body, req.query);
      const rawStatus = payload.status || payload.txn_status || payload.payment_status || payload.data?.status;
      const amount = payload.amount || payload.data?.amount;

      console.log(`[Async Webhook Received] Order: ${orderId}, Status: ${rawStatus}, Amount: ${amount}`);

      if (orderId) {
        const normalized = normalizeStatus(rawStatus);
        const nowStr = new Date().toISOString();

        if (orders[orderId]) {
          orders[orderId].status = normalized;
          if (normalized === 'SUCCESS') {
            orders[orderId].paid_at = nowStr;
          }
          orders[orderId].gateway_response = payload;
        } else {
          orders[orderId] = {
            order_id: orderId,
            amount: parseFloat(amount) || 0,
            status: normalized,
            created_at: nowStr,
            paid_at: normalized === 'SUCCESS' ? nowStr : undefined,
            gateway_response: payload
          };
        }
      }

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  };

  app.all(['/api/fampay/webhook', '/api/payment/webhook'], handleWebhook);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
        watch: isHmrDisabled ? null : undefined,
      },
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
