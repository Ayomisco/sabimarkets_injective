import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never run i18n middleware on API routes, static files, admin, or Next internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    pathname.startsWith('/admin') ||  // Exclude admin dashboard from i18n
    // Block common bot/scanner paths immediately
    pathname.includes('/wp-admin') ||
    pathname.includes('/wp-login') ||
    pathname.includes('/wordpress') ||
    pathname.includes('/xmlrpc') ||
    pathname.includes('.php') ||
    pathname.includes('.env') ||
    pathname.includes('/.git')
  ) {
    // Return 404 for scanner probes, pass-through for legitimate internals
    if (pathname.includes('/wp-') || pathname.includes('.php') || pathname.includes('wordpress')) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  return handleI18n(req);
}

export const config = {
  // Only run on page routes, not api / static / admin
  matcher: [
    '/((?!api|admin|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|logo.*|icon.*).*)',
  ],
};
