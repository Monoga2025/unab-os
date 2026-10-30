import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    
    // 1. Fetch Supabase Auth users
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) {
      console.error("[ADMIN USERS API] Error fetching users:", usersError);
    }

    // 2. Fetch Telegram links
    const { data: telegramLinks, error: tgError } = await admin
      .from("telegram_links")
      .select("owner_id, telegram_user_id, linked_at")
      .is("unlinked_at", null);

    if (tgError) {
      console.warn("[ADMIN USERS API] Error fetching telegram links:", tgError);
    }

    const tgMap = new Map<string, { telegram_user_id: string; linked_at: string }>();
    if (telegramLinks) {
      for (const link of telegramLinks) {
        tgMap.set(link.owner_id, link);
      }
    }

    const rawUsers = usersData?.users || [];

    const mappedUsers = rawUsers.map((u) => {
      const email = u.email || "";
      const prefix = email.split("@")[0] || "estudiante";
      const displayName = u.user_metadata?.full_name || u.user_metadata?.name || (prefix.charAt(0).toUpperCase() + prefix.slice(1));
      const tgLink = tgMap.get(u.id);

      return {
        id: u.id,
        email,
        displayName,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || u.created_at,
        isConfirmed: Boolean(u.email_confirmed_at),
        telegramLinked: Boolean(tgLink),
        telegramUserId: tgLink?.telegram_user_id || null,
        telegramLinkedAt: tgLink?.linked_at || null,
      };
    });

    // Sort by most recent
    mappedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      count: mappedUsers.length,
      users: mappedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ADMIN USERS API] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error al consultar usuarios registrados.",
        count: 0,
        users: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
