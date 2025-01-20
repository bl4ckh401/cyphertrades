import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/charting_library/')) {
    const response = NextResponse.next()
    response.headers.set('Content-Type', 'application/javascript')
    return response
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/charting_library/:path*',
}