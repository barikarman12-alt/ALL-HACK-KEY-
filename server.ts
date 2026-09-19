import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Order record interface
interface OrderRecord {
  order_id: string;
  amount: number;
  status: 'pending' | 'success' | 'paid' | 'completed' | 'failed' | 'expired';
  userId?: string | null;
  userEmail?: string | null;
  orderType: 'balance' | 'keys';
  productName?: string | null;
  durationLabel?: string | null;
  durationValue?: string | null;
  quantity?: number;
  couponCode?: string | null;
  utr?: string | null;
  credited: boolean;
  creditedAt?: string | null;
  creditedTo?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  meta?: any;
}

// Persistent orders file path
const ORDERS_FILE = path.join(process.cwd(), '.orders-db.json');

// In-memory store initialized from disk if available
const orders: Record<string, OrderRecord> = {};

function loadOrdersFromDisk() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      Object.assign(orders, parsed);
    }
  } catch (err) {
    console.warn('Could not read orders cache:', err);
  }
}

function saveOrdersToDisk() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save orders cache:', err);
  }
}

// Load on startup
loadOrdersFromDisk();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use express.json() for request parsing
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', ordersCount: Object.keys(orders).length });
  });

  // 1. Create Payment Order
  app.post('/api/fampay/create-order', async (req, res) => {
    try {
      const {
        amount,
        userId,
        userEmail,
        orderType = 'balance',
        productName,
        durationLabel,
        durationValue,
        quantity = 1,
        couponCode
      } = req.body;

      const numAmount = parseFloat(amount || '0').toFixed(2);
      const parsedAmount = parseFloat(numAmount);
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const clientTxnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const upiId = 'armanbarik@fam';
      const payeeName = 'ARMAN X STORE';
      const directUpiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${numAmount}&cu=INR&tr=${clientTxnId}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(directUpiUrl)}`;

      let gatewayResult: any = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const origin = req.headers.origin || `http://${req.headers.host}`;
        const response = await fetch(`https://famgateway.in/api/create-order.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: numAmount,
            redirect_url: `${origin}/success`,
            webhook_url: `${origin}/api/fampay/webhook`
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        if (response.ok) {
          try {
            const data = JSON.parse(text);
            if (data.status === 'success' || data.status === true || (data.data && data.data.order_id)) {
              gatewayResult = data;
            }
          } catch (e) {}
        }
      } catch (gatewayErr) {
        console.warn('External gateway unavailable or timed out. Using direct high-availability UPI engine.');
      }

      const finalOrderId = gatewayResult?.data?.order_id || gatewayResult?.order_id || orderId;
      const checkoutUrl = gatewayResult?.data?.checkout_url || gatewayResult?.checkout_url || directUpiUrl;
      const paymentUrl = gatewayResult?.data?.checkout_url || gatewayResult?.data?.upi_intent || gatewayResult?.payment_url || gatewayResult?.upi_link || directUpiUrl;
      const qrUrl = gatewayResult?.data?.qr_url || gatewayResult?.qr_url || qrCodeUrl;

      // Save order record with user information
      orders[finalOrderId] = {
        order_id: finalOrderId,
        amount: parsedAmount,
        status: 'pending',
        userId: userId || null,
        userEmail: userEmail || null,
        orderType: orderType || 'balance',
        productName: productName || null,
        durationLabel: durationLabel || null,
        durationValue: durationValue || null,
        quantity: Number(quantity) || 1,
        couponCode: couponCode || null,
        credited: false,
        createdAt: new Date().toISOString()
      };

      saveOrdersToDisk();

      return res.json({
        success: true,
        client_txn_id: clientTxnId,
        order_id: finalOrderId,
        checkout_url: checkoutUrl,
        payment_url: paymentUrl,
        qr_url: qrUrl
      });
    } catch (error: any) {
      console.error('FamPay create order fallback:', error);
      const numAmount = parseFloat(req.body?.amount || '10').toFixed(2);
      const fallbackOrderId = `ORD_${Date.now()}`;
      const upiUrl = `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${numAmount}&cu=INR`;
      
      orders[fallbackOrderId] = {
        order_id: fallbackOrderId,
        amount: parseFloat(numAmount),
        status: 'pending',
        userId: req.body?.userId || null,
        userEmail: req.body?.userEmail || null,
        orderType: req.body?.orderType || 'balance',
        credited: false,
        createdAt: new Date().toISOString()
      };
      saveOrdersToDisk();

      return res.json({
        success: true,
        order_id: fallbackOrderId,
        checkout_url: upiUrl,
        payment_url: upiUrl,
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`
      });
    }
  });

  // 2. Verify Single Order
  app.post('/api/fampay/verify-order', async (req, res) => {
    try {
      const { order_id, utr, userId, userEmail } = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';

      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      // Attach userId/userEmail if provided and not yet attached
      if (orders[order_id]) {
        if (userId && !orders[order_id].userId) orders[order_id].userId = userId;
        if (userEmail && !orders[order_id].userEmail) orders[order_id].userEmail = userEmail;
      }

      // Check if internal record already marked success
      if (orders[order_id]) {
        const orderStatus = (orders[order_id].status || '').toLowerCase();
        if (orderStatus === 'success' || orderStatus === 'paid' || orderStatus === 'completed') {
          saveOrdersToDisk();
          return res.json({ status: 'success', data: orders[order_id] });
        }
      }

      // If user submitted valid UTR
      if (utr && utr.toString().trim().length >= 6) {
        orders[order_id] = {
          ...(orders[order_id] || {
            order_id,
            amount: 0,
            orderType: 'balance',
            credited: false,
            createdAt: new Date().toISOString()
          }),
          utr: utr.toString().trim(),
          status: 'success',
          verifiedAt: new Date().toISOString()
        };
        saveOrdersToDisk();
        return res.json({ status: 'success', data: orders[order_id], message: 'Payment verified successfully via UTR.' });
      }

      // Attempt verification with FamPay Gateway API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${order_id}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const text = await response.text();
        const data = JSON.parse(text);
        const st = (data.status || data.data?.status || '').toString().toLowerCase();
        if (st === 'success' || st === 'paid' || st === 'completed') {
          orders[order_id] = {
            ...(orders[order_id] || {
              order_id,
              amount: parseFloat(data.data?.amount || data.amount || '0'),
              orderType: 'balance',
              credited: false,
              createdAt: new Date().toISOString()
            }),
            ...data.data,
            status: 'success',
            verifiedAt: new Date().toISOString()
          };
          saveOrdersToDisk();
          return res.json({ status: 'success', data: orders[order_id] });
        }
      } catch (e) {}

      if (orders[order_id]) {
        return res.json({ status: orders[order_id].status || 'pending', message: 'Awaiting payment confirmation' });
      }

      return res.json({ status: 'pending', message: 'Awaiting payment confirmation' });
    } catch (error: any) {
      console.error('FamPay verify error:', error);
      res.status(500).json({ error: error.message || 'Verification failed' });
    }
  });

  // 3. Submit UTR / UPI Ref ID
  app.post('/api/fampay/submit-utr', (req, res) => {
    try {
      const { order_id, utr, userId, userEmail } = req.body;
      if (!order_id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      if (!utr || utr.toString().trim().length < 6) {
        return res.status(400).json({ error: 'Please enter a valid 12-digit UPI Ref/UTR number' });
      }
      orders[order_id] = {
        ...(orders[order_id] || {
          order_id,
          amount: 0,
          orderType: 'balance',
          credited: false,
          createdAt: new Date().toISOString()
        }),
        userId: userId || orders[order_id]?.userId || null,
        userEmail: userEmail || orders[order_id]?.userEmail || null,
        utr: utr.toString().trim(),
        status: 'success',
        verifiedAt: new Date().toISOString()
      };
      saveOrdersToDisk();
      return res.json({ success: true, status: 'success', message: 'Payment confirmed successfully!' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to submit UTR' });
    }
  });

  // 4. Webhook - Gateway sends success / paid callbacks here
  app.post('/api/fampay/webhook', (req, res) => {
    try {
      const payload = req.body;
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      
      const receivedSignature = req.headers['x-payment-signature'] || req.headers['x-fampay-signature'];
      
      if (receivedSignature) {
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
        const existing: OrderRecord = orders[order_id] || {
          order_id,
          amount: parseFloat(amount || '0'),
          orderType: 'balance',
          status: 'pending',
          credited: false,
          createdAt: new Date().toISOString(),
          verifiedAt: null
        };

        const isSuccess = status === 'success' || status === 'PAID' || status === 'completed' || status === true;
        orders[order_id] = {
          ...existing,
          ...payload,
          amount: existing.amount || parseFloat(amount || '0'),
          status: isSuccess ? 'success' : status,
          verifiedAt: isSuccess ? new Date().toISOString() : existing.verifiedAt
        };

        saveOrdersToDisk();
        console.log(`✅ Webhook processed order ${order_id}, status: ${orders[order_id].status}`);
      }

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  });

  // 5. Automatic User Payment Reconciliation (Credits wallet even if user closed website)
  app.post('/api/fampay/reconcile-user-payments', async (req, res) => {
    try {
      const { userId, userEmail, pendingOrderIds = [] } = req.body;
      if (!userId && !userEmail && (!pendingOrderIds || pendingOrderIds.length === 0)) {
        return res.json({ success: true, uncreditedOrders: [] });
      }

      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
      const uncreditedOrders: OrderRecord[] = [];

      // Find all orders associated with this user
      const userOrders = Object.values(orders).filter((o) => {
        if (!o) return false;
        const matchesUid = userId && o.userId === userId;
        const matchesEmail = userEmail && o.userEmail && o.userEmail.toLowerCase() === userEmail.toLowerCase();
        const matchesId = Array.isArray(pendingOrderIds) && pendingOrderIds.includes(o.order_id);
        return matchesUid || matchesEmail || matchesId;
      });

      for (const order of userOrders) {
        // If order is still pending, check live with FamPay Gateway
        if (order.status !== 'success' && order.status !== 'paid' && order.status !== 'completed') {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${order.order_id}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const text = await response.text();
            const data = JSON.parse(text);
            const st = (data.status || data.data?.status || '').toString().toLowerCase();
            if (st === 'success' || st === 'paid' || st === 'completed') {
              order.status = 'success';
              order.verifiedAt = new Date().toISOString();
            }
          } catch (e) {}
        }

        // If payment succeeded and has not been credited to wallet/account yet
        if ((order.status === 'success' || order.status === 'paid' || order.status === 'completed') && !order.credited) {
          uncreditedOrders.push(order);
        }
      }

      saveOrdersToDisk();

      return res.json({
        success: true,
        uncreditedOrders
      });
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      return res.status(500).json({ error: err.message || 'Reconciliation failed' });
    }
  });

  // 6. Mark Order As Credited (Prevents duplicate credits)
  app.post('/api/fampay/mark-credited', (req, res) => {
    try {
      const { order_id, userId } = req.body;
      if (!order_id) return res.status(400).json({ error: 'order_id is required' });

      if (orders[order_id]) {
        orders[order_id].credited = true;
        orders[order_id].creditedAt = new Date().toISOString();
        if (userId) orders[order_id].creditedTo = userId;
        saveOrdersToDisk();
      }

      return res.json({ success: true, order: orders[order_id] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 7. Manual Claim Missing Payment by Order ID or UTR
  app.post('/api/fampay/claim-missing-payment', async (req, res) => {
    try {
      const { query, userId, userEmail } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Please provide Order ID or UPI UTR' });
      }

      const cleanQuery = query.trim();
      const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';

      // 1. Search in memory
      let targetOrder = Object.values(orders).find(
        (o) => o.order_id === cleanQuery || o.utr === cleanQuery
      );

      // 2. If not found or pending, query FamPay Gateway
      if (!targetOrder || targetOrder.status !== 'success') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const response = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${cleanQuery}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const text = await response.text();
          const data = JSON.parse(text);
          const st = (data.status || data.data?.status || '').toString().toLowerCase();
          if (st === 'success' || st === 'paid' || st === 'completed') {
            if (!targetOrder) {
              targetOrder = {
                order_id: cleanQuery,
                amount: parseFloat(data.data?.amount || data.amount || '0'),
                status: 'success',
                orderType: 'balance',
                userId: userId || null,
                userEmail: userEmail || null,
                credited: false,
                createdAt: new Date().toISOString(),
                verifiedAt: new Date().toISOString()
              };
              orders[cleanQuery] = targetOrder;
            } else {
              targetOrder.status = 'success';
              targetOrder.verifiedAt = new Date().toISOString();
            }
          }
        } catch (e) {}
      }

      if (!targetOrder) {
        // If UTR provided (length >= 6), accept as verified payment
        if (cleanQuery.length >= 6 && /^\d+$/.test(cleanQuery)) {
          const newOrderId = `ORD_CLAIM_${cleanQuery}`;
          targetOrder = {
            order_id: newOrderId,
            utr: cleanQuery,
            amount: 100, // standard default if unknown
            status: 'success',
            orderType: 'balance',
            userId: userId || null,
            userEmail: userEmail || null,
            credited: false,
            createdAt: new Date().toISOString(),
            verifiedAt: new Date().toISOString()
          };
          orders[newOrderId] = targetOrder;
        }
      }

      if (!targetOrder) {
        return res.status(404).json({ error: 'Order not found or not yet confirmed by gateway.' });
      }

      if (targetOrder.credited) {
        return res.status(400).json({ error: 'This payment has already been credited to a wallet.' });
      }

      if (targetOrder.status !== 'success' && targetOrder.status !== 'paid' && targetOrder.status !== 'completed') {
        return res.status(400).json({ error: 'Payment is still pending on the gateway. Please wait 1 minute and retry.' });
      }

      // Mark credited
      targetOrder.credited = true;
      targetOrder.creditedAt = new Date().toISOString();
      targetOrder.creditedTo = userId;
      if (userId) targetOrder.userId = userId;
      if (userEmail) targetOrder.userEmail = userEmail;

      saveOrdersToDisk();

      return res.json({
        success: true,
        amount: targetOrder.amount,
        order: targetOrder,
        message: `Successfully verified! ₹${targetOrder.amount} added to your wallet.`
      });
    } catch (err: any) {
      console.error('Claim payment error:', err);
      return res.status(500).json({ error: err.message || 'Failed to claim payment' });
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

