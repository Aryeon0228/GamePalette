const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

export function getLemonSqueezyConfig() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  return {
    apiKey,
    storeId,
    variantId,
    webhookSecret,
    isConfigured: !!(apiKey && storeId && variantId),
  };
}

export async function createCheckout({
  variantId,
  userId,
  userEmail,
  userName,
  redirectUrl,
}: {
  variantId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  redirectUrl: string;
}) {
  const config = getLemonSqueezyConfig();

  if (!config.apiKey || !config.storeId) {
    throw new Error('Lemon Squeezy is not configured');
  }

  const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            name: userName || userEmail.split('@')[0],
            custom: {
              user_id: userId,
            },
          },
          checkout_options: {
            redirect_url: redirectUrl,
          },
          product_options: {
            redirect_url: redirectUrl,
            receipt_link_url: redirectUrl,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: config.storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error('Failed to create checkout');
  }

  const data = await response.json();
  return data.data.attributes.url as string;
}

export async function getSubscription(subscriptionId: string) {
  const config = getLemonSqueezyConfig();

  if (!config.apiKey) {
    throw new Error('Lemon Squeezy is not configured');
  }

  const response = await fetch(`${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`, {
    headers: {
      'Accept': 'application/vnd.api+json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get subscription');
  }

  const data = await response.json();
  return data.data;
}

export async function cancelSubscription(subscriptionId: string) {
  const config = getLemonSqueezyConfig();

  if (!config.apiKey) {
    throw new Error('Lemon Squeezy is not configured');
  }

  const response = await fetch(`${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }

  return true;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Lemon Squeezy uses HMAC SHA256 for webhook signatures
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
