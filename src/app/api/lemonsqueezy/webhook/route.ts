import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for webhook operations (bypasses RLS)
const getServiceSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey);
};

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('x-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Verify webhook signature
  if (!verifySignature(body, signature, webhookSecret)) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const event = JSON.parse(body);
    const eventName = event.meta.event_name;
    const customData = event.meta.custom_data || {};
    const userId = customData.user_id;

    console.log('Lemon Squeezy webhook event:', eventName);

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated': {
        const subscription = event.data.attributes;
        const subscriptionId = event.data.id;
        const status = subscription.status; // active, on_trial, paused, past_due, unpaid, cancelled, expired
        const isActive = status === 'active' || status === 'on_trial';

        if (userId) {
          // Upsert subscription record
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            lemonsqueezy_subscription_id: subscriptionId,
            lemonsqueezy_customer_id: subscription.customer_id?.toString(),
            lemonsqueezy_variant_id: subscription.variant_id?.toString(),
            status: status,
            current_period_start: subscription.created_at,
            current_period_end: subscription.renews_at,
            cancel_at_period_end: subscription.cancelled,
          }, {
            onConflict: 'user_id',
          });

          // Update profile premium status
          await supabase
            .from('profiles')
            .update({ is_premium: isActive })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        const subscriptionId = event.data.id;

        if (userId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('lemonsqueezy_subscription_id', subscriptionId);

          await supabase
            .from('profiles')
            .update({ is_premium: false })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription_payment_failed': {
        const subscriptionId = event.data.id;

        if (userId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('lemonsqueezy_subscription_id', subscriptionId);
        }
        break;
      }

      case 'order_created': {
        // One-time payment or first subscription payment
        console.log('Order created for user:', userId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
