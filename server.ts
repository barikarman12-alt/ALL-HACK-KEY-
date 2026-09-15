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
      const { amount } = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const clientTxnId = `txn_${Math.random().toString(36).substring(2, 11)}`;
      
      const response = await fetch(`https://famgateway.in/api/create-order.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
          redirect_url: 'https://ais-dev-s5atqxhsiz6qmotgrq7mrc-935483012651.asia-east1.run.app/success',
          webhook_url: 'https://ais-dev-s5atqxhsiz6qmotgrq7mrc-935483012651.asia-east1.run.app/api/fampay/webhook'
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(500).json({ error: 'Failed to communicate with payment gateway', details: text, status: response.status });
      }

      const data = await response.json();
      // Adjusting to handle whatever famgateway.in returns - assuming it returns status and data
      if (data.status === 'success' || data.status === true || (data.data && data.data.order_id)) {
        res.json({
          success: true,
          client_txn_id: clientTxnId,
          order_id: data.data?.order_id || data.order_id || clientTxnId,
          checkout_url: data.data?.checkout_url || data.checkout_url,
          payment_url: data.data?.checkout_url || data.data?.upi_intent || data.payment_url || data.upi_link || `upi://pay?pa=armanbarik@fam&pn=Purchase&am=${amount}&cu=INR`,
          qr_url: data.data?.qr_url || data.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=armanbarik@fam&pn=Purchase&am=${amount}&cu=INR`
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

      if (!order_id) {
         return res.status(400).json({ error: 'order_id is required' });
      }

      // Check if the webhook already confirmed this order
      if (orders[order_id] && orders[order_id].status === 'success') {
         return res.json({ status: 'success', data: orders[order_id] });
      }

      const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${order_id}`);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).json({ error: 'Invalid response from payment gateway', details: text });
      }
      
      return res.status(response.status).json(data);
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
