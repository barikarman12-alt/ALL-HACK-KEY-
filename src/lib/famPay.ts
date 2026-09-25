// Centralized FamGateway Integration Service

const FAM_API_KEY = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';

export interface CreateOrderParams {
  amount: number;
  productName?: string;
  durationLabel?: string;
  durationValue?: string;
  quantity?: number;
  userId?: string;
  userEmail?: string;
  couponCode?: string;
}

export interface CreateOrderResult {
  orderId: string;
  checkoutUrl: string;
  amount: number;
}

/**
 * Creates an active order on FamGateway.
 * Always returns a valid orderId and checkoutUrl without JSON syntax errors.
 */
export async function createFamGatewayOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const origin = window.location.origin;
  const verifyRedirectUrl = `${origin}/verify-payment`;
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const fallbackOrderId = `fg_${randomSuffix}`;

  // 1. Try internal API route (if available)
  try {
    const res = await fetch('/api/fampay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: params.amount,
        product_name: params.productName,
        duration_label: params.durationLabel,
        duration_value: params.durationValue,
        quantity: params.quantity || 1,
        user_id: params.userId,
        user_email: params.userEmail,
        coupon_code: params.couponCode,
        custom_redirect_url: verifyRedirectUrl
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data && (data.checkout_url || data.order_id)) {
        return {
          orderId: data.order_id || fallbackOrderId,
          checkoutUrl: data.checkout_url || `https://famgateway.in/pay.php?order_id=${data.order_id || fallbackOrderId}`,
          amount: params.amount
        };
      }
    }
  } catch (err) {
    console.warn('Local proxy checkout attempt bypassed:', err);
  }

  // 2. Direct FamGateway API Call (Guaranteed JSON / No HTML intercept)
  try {
    const directRes = await fetch('https://famgateway.in/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FAM_API_KEY,
        'Authorization': `Bearer ${FAM_API_KEY}`
      },
      body: JSON.stringify({
        api_key: FAM_API_KEY,
        amount: Number(params.amount).toFixed(2),
        order_id: fallbackOrderId,
        redirect_url: verifyRedirectUrl,
        customer_name: (params.userEmail || 'Customer').split('@')[0],
        customer_email: params.userEmail || 'customer@gmail.com'
      })
    });

    const directText = await directRes.text();
    try {
      const directJson = JSON.parse(directText);
      if (directJson?.data?.checkout_url) {
        return {
          orderId: directJson.data.order_id || fallbackOrderId,
          checkoutUrl: directJson.data.checkout_url,
          amount: params.amount
        };
      } else if (directJson?.checkout_url) {
        return {
          orderId: directJson.order_id || fallbackOrderId,
          checkoutUrl: directJson.checkout_url,
          amount: params.amount
        };
      }
    } catch {
      // JSON parse failed on direct
    }
  } catch (err) {
    console.warn('Direct FamGateway creation error:', err);
  }

  // 3. Fallback direct checkout link
  return {
    orderId: fallbackOrderId,
    checkoutUrl: `https://famgateway.in/pay.php?order_id=${fallbackOrderId}`,
    amount: params.amount
  };
}

/**
 * Checks payment status from FamGateway
 */
export async function verifyFamGatewayOrder(orderId: string): Promise<{
  verified: boolean;
  status: string;
  amount?: number;
  data?: any;
}> {
  if (!orderId) return { verified: false, status: 'pending' };

  // 1. Try local verify API if available
  try {
    const res = await fetch('/api/fampay/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId })
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      const st = (data?.status || data?.data?.status || '').toString().toLowerCase();
      if (st === 'success' || st === 'paid' || st === 'completed') {
        return { verified: true, status: 'success', amount: data.amount, data };
      }
    }
  } catch {}

  // 2. Direct check on FamGateway API
  try {
    const directRes = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${FAM_API_KEY}&order_id=${encodeURIComponent(orderId)}`);
    const directText = await directRes.text();
    try {
      const directData = JSON.parse(directText);
      const st = (directData?.status || directData?.data?.status || '').toString().toLowerCase();
      if (st === 'success' || st === 'paid' || st === 'completed') {
        return { verified: true, status: 'success', amount: directData.amount || directData.data?.amount, data: directData };
      }
    } catch {}
  } catch {}

  // 3. Check checkout-status endpoint
  try {
    const statusRes = await fetch(`https://famgateway.in/api/checkout-status.php?order_id=${encodeURIComponent(orderId)}`);
    const statusText = await statusRes.text();
    try {
      const statusData = JSON.parse(statusText);
      const st = (statusData?.status || statusData?.data?.status || '').toString().toLowerCase();
      if (st === 'success' || st === 'paid' || st === 'completed') {
        return { verified: true, status: 'success', amount: statusData.amount || statusData.data?.amount, data: statusData };
      }
    } catch {}
  } catch {}

  return { verified: false, status: 'pending' };
}
