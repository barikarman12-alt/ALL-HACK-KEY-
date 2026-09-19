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
         return res.status(400).json({ status: 'error', error: 'Valid order_id is required' });
      }

      // 1. Check if the webhook or in-memory cache already confirmed this order
      if (orders[order_id]) {
        const orderStatus = (orders[order_id].status || '').toString().toLowerCase();
        if (orderStatus === 'success' || orderStatus === 'paid' || orderStatus === 'completed') {
          return res.json({ status: 'success', data: orders[order_id] });
        }
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Api-Key': apiKey,
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      };

      let rawResponse: any = null;
      let responseText = '';

      // Try GET request with query params
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const getUrl = `https://famgateway.in/api/verify-order.php?api_key=${encodeURIComponent(apiKey)}&order_id=${encodeURIComponent(order_id)}`;
        const getRes = await fetch(getUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (getRes.ok) {
          responseText = await getRes.text();
        }
      } catch (e: any) {
        console.warn('GET verify-order notice:', e.message);
      }

      // If GET didn't produce a valid response, try POST
      if (!responseText || responseText.includes('error') || responseText.includes('404')) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const postRes = await fetch(`https://famgateway.in/api/verify-order.php`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              api_key: apiKey,
              order_id: order_id
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (postRes.ok) {
            responseText = await postRes.text();
          }
        } catch (e: any) {
          console.warn('POST verify-order notice:', e.message);
        }
      }

      if (responseText) {
        try {
          rawResponse = JSON.parse(responseText);
        } catch (e) {
          console.warn('Verify response was not JSON:', responseText.substring(0, 100));
        }
      }

      if (rawResponse) {
        const st = (
          rawResponse.status || 
          rawResponse.data?.status || 
          rawResponse.payment_status || 
          rawResponse.data?.payment_status || 
          rawResponse.txn_status || 
          ''
        ).toString().toLowerCase();

        const isSuccess = st === 'success' || st === 'paid' || st === 'completed' || rawResponse.status === true;

        if (isSuccess) {
          orders[order_id] = { status: 'success', ...rawResponse };
          return res.json({ status: 'success', data: rawResponse.data || rawResponse });
        }

        return res.json({ 
          status: 'pending', 
          message: rawResponse.message || 'Payment is awaiting confirmation from UPI gateway. Please wait a few seconds and verify again.' 
        });
      }

      // If gateway is temporarily slow or not returning JSON yet
      return res.json({
        status: 'pending',
        message: 'Checking with payment gateway... If you completed the UPI payment, please tap Verify again in 5 seconds.'
      });

    } catch (error: any) {
      console.error('FamPay verify error:', error);
      res.json({ 
        status: 'pending', 
        message: 'Could not reach gateway. If paid, please retry in a moment.' 
      });
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
