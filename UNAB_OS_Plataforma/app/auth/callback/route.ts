import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { normalizeInstitutionalEmail } from "@/lib/domain/academic-collaboration";
import { safeAuthRedirectPath } from "@/lib/supabase/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const fallbackPath = type === "recovery" ? "/reset-password" : "/materias";
  const next = safeAuthRedirectPath(request.nextUrl.searchParams.get("next"), fallbackPath);
  const supabase = await createClient();

  let verified = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && (type === "email" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    verified = !error;
  }

  if (verified) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !normalizeInstitutionalEmail(user.email ?? "")) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(new URL("/login?error=institutional-email-required", request.url));
    }
  }

  return NextResponse.redirect(new URL(verified ? next : "/forgot-password?error=invalid-link", request.url));
}
