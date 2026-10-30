import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Server-side route guards remain the authorization boundary.
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tema/:path*",
    "/study/:path*",
    "/tutor/:path*",
    "/progress/:path*",
    "/course/:path*",
    "/objective/:path*",
    "/materias/:path*",
    "/section/:path*",
    "/evaluaciones/:path*",
    "/api/tutor/:path*",
    "/api/uploads/:path*",
    "/api/study/:path*",
    "/api/tema/:path*",
    "/api/telegram/:path*",
  ],
};
