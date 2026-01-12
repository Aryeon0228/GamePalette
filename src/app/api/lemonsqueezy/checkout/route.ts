import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckout, getLemonSqueezyConfig } from '@/lib/lemonsqueezy/server';

export async function POST(request: NextRequest) {
  try {
    const config = getLemonSqueezyConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        { error: 'Payment system is not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 500 }
      );
    }

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const redirectUrl = `${origin}/pricing?success=true`;

    // Create checkout session
    const checkoutUrl = await createCheckout({
      variantId: config.variantId!,
      userId: user.id,
      userEmail: user.email!,
      userName: user.user_metadata?.full_name,
      redirectUrl,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
