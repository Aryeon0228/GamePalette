import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext) {
    return '/';
  }

  const nextPath = rawNext.trim();
  if (!nextPath.startsWith('/') || nextPath.startsWith('//') || nextPath.includes('\\')) {
    return '/';
  }

  return nextPath;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = getSafeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();

    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error:', error.message, error);
      }

      if (!error) {
        return NextResponse.redirect(new URL(nextPath, origin));
      }
    } else {
      console.error('Auth callback error: Supabase client is not configured');
    }
  } else {
    console.error('Auth callback error: No code parameter in URL');
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
