import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  displayTelegramLinkCode,
  generateTelegramLinkCode,
  hashTelegramLinkCode,
  normalizeTelegramLinkCode,
} from "@/lib/telegram/pairing";
import { config as proxyConfig } from "@/proxy";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/20260825153226_telegram_pairing.sql");
const pairingHelpers = source("lib/telegram/pairing.ts");
const pairingRoute = source("app/api/telegram/pairing/route.ts");
const linkRoute = source("app/api/jarvis/bridge/link/route.ts");
const identityAuth = source("lib/jarvis/cloud-auth.ts");
const handoffRoute = source("app/api/jarvis/bridge/handoffs/route.ts");
const claimRoute = source("app/api/jarvis/bridge/claim/route.ts");
const documentRoute = source("app/api/jarvis/bridge/handoffs/[handoffId]/document/route.ts");
const deliveredRoute = source("app/api/jarvis/bridge/handoffs/[handoffId]/delivered/route.ts");
const reportRoute = source("app/api/jarvis/bridge/reports/route.ts");
const catalogRoute = source("app/api/jarvis/bridge/catalog/route.ts");
const cloudQueue = source("lib/jarvis/cloud.ts");

const originalPairingSecret = process.env.TELEGRAM_LINK_CODE_SECRET;

describe.sequential("Telegram pairing and multi-tenant bridge contract", () => {
  beforeEach(() => {
    process.env.TELEGRAM_LINK_CODE_SECRET = "pairing-test-secret-with-at-least-32-bytes";
  });

  afterEach(() => {
    if (originalPairingSecret === undefined) delete process.env.TELEGRAM_LINK_CODE_SECRET;
    else process.env.TELEGRAM_LINK_CODE_SECRET = originalPairingSecret;
  });

  it("creates a copiable high-entropy code and persists only its HMAC digest", () => {
    const codes = new Set(Array.from({ length: 128 }, generateTelegramLinkCode));
    expect(codes.size).toBe(128);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
      expect(normalizeTelegramLinkCode(displayTelegramLinkCode(code))).toBe(code);
      const digest = hashTelegramLinkCode(code);
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      expect(digest).not.toContain(code);
    }
    expect(migration).toMatch(/create table public\.telegram_link_codes[\s\S]*?code_hash text not null/);
    expect(migration).not.toMatch(/telegram_link_codes[\s\S]{0,400}\b(?:code|plaintext)_value\b/i);
  });

  it("enforces expiration, one open code, one-use atomic consumption and brute-force limits", () => {
    expect(pairingRoute).toMatch(/CODE_LIFETIME_MS = 10 \* 60 \* 1000/);
    expect(migration).toMatch(/telegram_link_codes_one_open_per_owner_idx[\s\S]*?where consumed_at is null/);
    expect(migration).toMatch(/p_expires_at > v_now \+ interval '15 minutes'/);
    expect(migration).toMatch(/code\.consumed_at is null[\s\S]*?code\.expires_at > v_now[\s\S]*?for update/);
    expect(migration).toMatch(/insert into public\.telegram_links[\s\S]*?update public\.telegram_link_codes[\s\S]*?set consumed_at = v_now/);
    expect(migration).toMatch(/pg_advisory_xact_lock/);
    expect(migration).toMatch(/attempt_count between 0 and 5/);
    expect(migration).toMatch(/blocked_until = v_now \+ interval '15 minutes'/);
    expect(migration).toMatch(/on conflict on constraint telegram_link_attempts_pkey do nothing/);
    expect(migration).toMatch(/update public\.telegram_link_attempts as attempt[\s\S]*?attempt\.telegram_user_id = p_telegram_user_id/);
    expect(migration).toMatch(/Telegram advisory lock -> owner advisory lock -> code row lock/);
    expect(migration).toMatch(/hashtextextended\(v_owner_id::text, 80421\)[\s\S]*?code\.id = v_code_id[\s\S]*?for update[\s\S]*?insert into public\.telegram_links/);
  });

  it("allows only /link in a private chat before an active identity exists", () => {
    expect(linkRoute).toMatch(/telegramRecipientFromRequest\(request\)/);
    expect(linkRoute).toMatch(/Pairing is only available in a private Telegram chat/);
    expect(pairingHelpers).toMatch(/telegramUserId !== telegramChatId/);
    const bot = source("deployment/jarvis/src/jarvis/bot.py");
    expect(bot).toMatch(/application\.add_handler\(CommandHandler\("link", link_command\)\)/);
    expect(bot).toMatch(/if update\.effective_chat\.id != update\.effective_user\.id/);
    expect(bot).toMatch(/if not await telegram_identity_is_active/);
    expect(bot).toMatch(/Abrí \*\*Universidad OS → Inicio\*\*/);
  });

  it("keeps immutable link history while allowing unlink and a later relink", () => {
    expect(migration).toMatch(/unlinked_at timestamptz/);
    expect(migration).toMatch(/telegram_links_one_active_per_owner_idx[\s\S]*?where unlinked_at is null/);
    expect(migration).toMatch(/telegram_links_one_active_per_telegram_idx[\s\S]*?where unlinked_at is null/);
    expect(migration).toMatch(/on update restrict on delete restrict/);
    expect(pairingRoute).toMatch(/rpc\("unlink_telegram_account"/);
    expect(migration).toMatch(/insert into public\.telegram_links[\s\S]*?on conflict do nothing/);
    expect(identityAuth).toMatch(/Telegram legacy history lookup failed/);
    expect(identityAuth).toMatch(/\.or\(`owner_id\.eq\.\$\{authorization\.legacyOwnerId\},telegram_user_id\.eq\.\$\{recipient\.telegramUserId\}`\)/);
    expect(identityAuth).toMatch(/if \(\(historical \?\? \[\]\)\.length > 0\) return null/);
    expect(migration).toMatch(/telegram_user_id = p_telegram_user_id[\s\S]*?owner_id <> v_owner_id/);
  });

  it("refreshes the browser session for pairing APIs without exposing the service bridge", () => {
    expect(proxyConfig.matcher).toContain("/api/telegram/:path*");
    expect(proxyConfig.matcher).not.toContain("/api/jarvis/bridge/:path*");
  });

  it("requires same-origin browser mutations and unlinks atomically", () => {
    const deleteHandler = pairingRoute.slice(pairingRoute.indexOf("export async function DELETE"));
    expect(pairingRoute).toMatch(/new URL\(origin\)\.origin === new URL\(request\.url\)\.origin/);
    expect(pairingRoute).toMatch(/export async function POST\(request: Request\)[\s\S]*?!hasSameOrigin\(request\)[\s\S]*?status: 403/);
    expect(pairingRoute).toMatch(/export async function DELETE\(request: Request\)[\s\S]*?!hasSameOrigin\(request\)[\s\S]*?status: 403/);
    expect(migration).toMatch(/function public\.unlink_telegram_account[\s\S]*?pg_advisory_xact_lock/);
    expect(migration).toMatch(/function public\.unlink_telegram_account[\s\S]*?set unlinked_at = v_now[\s\S]*?set consumed_at = v_now[\s\S]*?status = 'failed'/);
    expect(deleteHandler).not.toMatch(/\.from\("telegram_links"\)|\.from\("telegram_link_codes"\)|\.from\("jarvis_study_handoffs"\)/);
  });

  it("derives owner and destination server-side and scopes every artifact to that identity", () => {
    expect(identityAuth).toMatch(/\.eq\("telegram_user_id", recipient\.telegramUserId\)/);
    expect(identityAuth).toMatch(/\.is\("unlinked_at", null\)/);
    expect(handoffRoute).not.toMatch(/body\?\.ownerId|body\["ownerId"\]/);
    expect(reportRoute).not.toMatch(/body\?\.ownerId|report\.ownerId/);
    for (const route of [handoffRoute, claimRoute, documentRoute, deliveredRoute, reportRoute, catalogRoute]) {
      expect(route).toMatch(/identity\.ownerId/);
    }
    for (const route of [claimRoute, documentRoute, deliveredRoute, reportRoute]) {
      expect(route).toMatch(/telegram_link_id/);
      expect(route).toMatch(/telegram_recipient_user_id/);
      expect(route).toMatch(/telegram_recipient_chat_id/);
    }
  });

  it("blocks enqueue, claim and report after unlink without breaking historical handoffs", () => {
    expect(migration).toMatch(/insert own jarvis handoffs[\s\S]*?link\.unlinked_at is null/);
    expect(migration).toMatch(/function public\.lock_and_validate_jarvis_handoff_telegram_target[\s\S]*?hashtextextended\(new\.owner_id::text, 80421\)[\s\S]*?link\.unlinked_at is null/);
    expect(migration).toMatch(/create trigger jarvis_handoffs_lock_active_telegram_target[\s\S]*?before insert on public\.jarvis_study_handoffs/);
    expect(cloudQueue).toMatch(/\.is\("unlinked_at", null\)\.maybeSingle\(\)/);
    expect(cloudQueue).toMatch(/Conecta Telegram desde Inicio/);
    expect(migration).toMatch(/unlink_telegram_account[\s\S]*?status in \('queued', 'processing'\)/);
    expect(migration).toMatch(/unlink_telegram_account[\s\S]*?failure_reason = 'Telegram fue desvinculado/);
    expect(claimRoute).toMatch(/\.is\("unlinked_at", null\)/);
    expect(reportRoute).toMatch(/resolveJarvisBridgeIdentity/);
    expect(migration).toMatch(/telegram_link_id[\s\S]*?references public\.telegram_links/);
  });

  it("does not destroy a queued handoff on transient destination lookup failure", () => {
    expect(claimRoute).toMatch(/if \(error\) throw new Error\(`Telegram target verification failed/);
    expect(claimRoute).toMatch(/catch \{[\s\S]*?Telegram target verification failed\.[\s\S]*?status: 500/);
    expect(claimRoute).not.toMatch(/verifiedRecipient\([^;]+\.catch\(\(\) => null\)/s);
    expect(claimRoute).toMatch(/HANDOFF_DOCUMENT_INVALID/);
    expect(claimRoute).toMatch(/failure_reason: "El documento relacionado no está disponible para entrega\."/);
  });

  it("separates permanent missing documents and invalid codes from transient service failures", () => {
    expect(linkRoute).toMatch(/if \(error\)[\s\S]*?Pairing service is temporarily unavailable[\s\S]*?status: 500/);
    expect(linkRoute).toMatch(/if \(!linked\)[\s\S]*?Invalid, expired or already used[\s\S]*?status: 400/);
    expect(documentRoute).toMatch(/if \(error\) return Response\.json\(\{ error: "Document lookup failed\." \}, \{ status: 500 \}\)/);
    expect(documentRoute).toMatch(/\[400, 404\]\.includes[\s\S]*?failPermanentDocument[\s\S]*?status: 503/);
    expect(documentRoute).toMatch(/failure_reason: "El documento privado ya no está disponible para entrega\."/);
  });

  it("keeps hashes, storage locations and secrets out of catalog responses", () => {
    expect(catalogRoute).not.toMatch(/select\([^)]*sha256/);
    expect(catalogRoute).not.toMatch(/storage_bucket|storage_object_name|local_relative_path/);
    expect(catalogRoute).not.toMatch(/JARVIS_BRIDGE_TOKEN|TELEGRAM_LINK_CODE_SECRET/);
    expect(catalogRoute).toMatch(/candidateId: file\.candidate_id/);
  });

  it("uses explicit RLS, grants and service-only pairing RPC execution", () => {
    for (const table of ["telegram_links", "telegram_link_codes", "telegram_link_attempts"]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"));
    }
    expect(migration).toMatch(/security definer[\s\S]*?set search_path = ''/);
    expect(migration).toMatch(/revoke execute on function public\.issue_telegram_link_code[\s\S]*?from public, anon, authenticated/);
    expect(migration).toMatch(/revoke execute on function public\.consume_telegram_link_code[\s\S]*?from public, anon, authenticated/);
    expect(migration).toMatch(/revoke execute on function public\.unlink_telegram_account[\s\S]*?from public, anon, authenticated/);
    expect(migration).toMatch(/revoke execute on function public\.lock_and_validate_jarvis_handoff_telegram_target\(\)[\s\S]*?from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.consume_telegram_link_code[\s\S]*?to service_role/);
    expect(migration).toMatch(/grant execute on function public\.unlink_telegram_account[\s\S]*?to service_role/);
    expect(migration).toMatch(/telegram_links_owner_history_idx[\s\S]*?telegram_link_codes_owner_history_idx[\s\S]*?jarvis_handoffs_telegram_link_idx/);
  });

  it("compares JSONB reports canonically and retries the reviewed transition", () => {
    expect(reportRoute).toMatch(/function canonicalJson/);
    expect(reportRoute).toMatch(/Object\.keys\(record\)\.sort\(\)/);
    expect(reportRoute).not.toMatch(/JSON\.stringify\(existing\.report\) !== JSON\.stringify\(report\)/);
    expect(reportRoute).toMatch(/if \(existing\)[\s\S]*?status: "reviewed"[\s\S]*?retryError/);
  });

  it("authorizes demo sessions and gracefully generates pairing codes without 401", () => {
    expect(pairingRoute).toMatch(/requireUser/);
    expect(pairingRoute).toMatch(/uninova_demo_session/);
    expect(pairingRoute).toMatch(/auth\.getUser/);
    expect(pairingRoute).toMatch(/command:\s*`\/link \$\{displayTelegramLinkCode\(rawCode\)\}`/);
    expect(pairingRoute).toMatch(/status:\s*201/);
  });
});

