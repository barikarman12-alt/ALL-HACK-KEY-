import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// In-memory store for webhook order tracking
const orders: Record<string, any> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use express.json() which replaces the need for body-parser
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/fampay/create-order', async (req, res) => {
    try {
      const { amount, redirect_url: customRedirect, origin: customOrigin } = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const clientTxnId = `txn_${Math.random().toString(36).substring(2, 11)}`;
      
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
      const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
      let serverOrigin = `${forwardedProto}://${forwardedHost}`;
      if (!serverOrigin.startsWith('https://') && !serverOrigin.includes('localhost')) {
        serverOrigin = serverOrigin.replace('http://', 'https://');
      }

      const origin = customOrigin || req.headers.origin || serverOrigin;
      const finalRedirectUrl = customRedirect || `${origin}/success`;
      const finalWebhookUrl = `${origin}/api/fampay/webhook`;

      const response = await fetch(`https://famgateway.in/api/create-order.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
          redirect_url: finalRedirectUrl,
          webhook_url: finalWebhookUrl
        })
      });

      const text = await response.text();
      
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to communicate with payment gateway', details: text, status: response.status });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON received from payment gateway:', text.substring(0, 100));
        return res.status(502).json({ error: 'Invalid response from payment gateway. Please try again later.' });
      }

      if (data.status === 'success' || data.status === true || (data.data && data.data.order_id)) {
        res.json({
          success: true,
          client_txn_id: clientTxnId,
          order_id: data.data?.order_id || data.order_id || clientTxnId,
          checkout_url: data.data?.checkout_url || data.checkout_url,
          payment_url: data.data?.checkout_url || data.data?.upi_intent || data.payment_url || data.upi_link,
          qr_url: data.data?.qr_url || data.qr_url,
          redirect_url: finalRedirectUrl
        });
      } else {
        res.status(400).json({ error: data.message || 'Payment initiation failed', details: data });
      }
    } catch (error: any) {
      console.error('FamPay create order error:', error);
      res.status(500).json({ error: error.message || 'Payment initiation failed' });
    }
  });

  app.post('/api/fampay/verify-order', async (req, res) => {
    try {
      const { order_id } = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';

      if (!order_id || typeof order_id !== 'string') {
         return res.status(400).json({ error: 'Valid order_id is required' });
      }

      // Check if the webhook already confirmed this order
      if (orders[order_id]) {
        const orderStatus = (orders[order_id].status || '').toLowerCase();
        if (orderStatus === 'success' || orderStatus === 'paid' || orderStatus === 'completed') {
          return res.json({ status: 'success', data: orders[order_id] });
        }
      }

      const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${encodeURIComponent(order_id)}`);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Verify order invalid JSON:', text.substring(0, 100));
        return res.json({ status: 'pending', message: 'Awaiting confirmation from payment gateway' });
      }
      
      const st = (data.status || data.data?.status || '').toString().toLowerCase();
      if (st === 'success' || st === 'paid' || st === 'completed') {
        return res.json({ status: 'success', data: data.data || data });
      }
      
      return res.json({ status: 'pending', message: data.message || 'Payment pending or not confirmed' });
    } catch (error: any) {
      console.error('FamPay verify error:', error);
      res.status(500).json({ error: error.message || 'Verification failed' });
    }
  });

  // 2. Webhook - Gateway will send data here after payment
  app.post('/api/fampay/webhook', (req, res) => {
    try {
      const payload = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      
      // 3. Security Verification (Check signature to prevent fake requests)
      const receivedSignature = req.headers['x-payment-signature'] || req.headers['x-fampay-signature'];
      
      if (receivedSignature) {
         // Create HMAC signature
         const expectedSignature = crypto
             .createHmac('sha256', apiKey)
             .update(JSON.stringify(payload))
             .digest('hex');

         if (receivedSignature !== expectedSignature) {
             return res.status(401).json({ error: 'Invalid Signature! Fake request detected.' });
         }
      }

      const { order_id, status, amount } = payload;
      console.log(`Webhook received for order: ${order_id}, status: ${status}, amount: ${amount}`);

      if (order_id) {
         orders[order_id] = { ...payload };
         
         if (status === 'success' || status === 'PAID') {
            console.log(`✅ Payment successful for ${order_id}. Validated via Webhook.`);
         } else {
            console.log(`❌ Payment status updated to ${status} for ${order_id}.`);
         }
      }

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error processing webhook' });
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
