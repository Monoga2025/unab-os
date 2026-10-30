import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authForm from "@/app/login/auth-form";
import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";

vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/auth", () => ({
  directInstitutionalLogin: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

type MagicLinkClient = {
  auth: {
    signInWithOtp: (input: { email: string; options: { emailRedirectTo: string } }) => Promise<{ error: unknown }>;
  };
};

const mockedCreateClient = vi.mocked(createClient);
const signOut = vi.fn();
const getUser = vi.fn();
const exchangeCodeForSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UNAB passwordless login", () => {
  it("authenticates directly with a normalized institutional email", async () => {
    expect(authForm).toHaveProperty("authenticateDirectInstitutionalEmail");
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    const signUp = vi.fn().mockResolvedValue({ data: null, error: null });

    const result = await authForm.authenticateDirectInstitutionalEmail({
      client: { auth: { signInWithPassword, signUp } },
      email: " ANA@UNAB.EDU.CO ",
    });

    expect(result).toBe("success");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user9@example.edu",
      password: authForm.deriveInternalEmailPassword("user9@example.edu"),
    });

    const invalidResult = await authForm.authenticateDirectInstitutionalEmail({
      client: { auth: { signInWithPassword, signUp } },
      email: "student@example.com",
    });
    expect(invalidResult).toBe("invalid");
  });

  it("sends a magic link only to a normalized institutional email", async () => {
    expect(authForm).toHaveProperty("requestInstitutionalMagicLink");
    const requestInstitutionalMagicLink = authForm.requestInstitutionalMagicLink as unknown as (input: {
      client: MagicLinkClient;
      email: string;
      origin: string;
    }) => Promise<"invalid" | "failed" | "sent">;
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    await expect(requestInstitutionalMagicLink({
      client: { auth: { signInWithOtp } },
      email: " ANA@UNAB.EDU.CO ",
      origin: "https://unab.example",
    })).resolves.toBe("sent");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user9@example.edu",
      options: { emailRedirectTo: "https://unab.example/auth/callback?next=/materias" },
    });

    await expect(requestInstitutionalMagicLink({
      client: { auth: { signInWithOtp } },
      email: "student@example.com",
      origin: "https://unab.example",
    })).resolves.toBe("invalid");
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it("signs out a non-institutional user after exchanging a magic-link code", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { email: "student@example.com" } }, error: null });
    signOut.mockResolvedValue({ error: null });
    mockedCreateClient.mockResolvedValue({
      auth: { exchangeCodeForSession, getUser, signOut },
    } as never);

    const response = await GET(new NextRequest("https://unab.example/auth/callback?code=valid"));

    expect(response.headers.get("location")).toBe("https://unab.example/login?error=institutional-email-required");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("applies the institutional guard to direct server consumers", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "student@example.com" } }, error: null });
    signOut.mockResolvedValue({ error: null });
    mockedCreateClient.mockResolvedValue({ auth: { getUser, signOut } } as never);

    await expect(requireUser()).rejects.toThrow("redirect:/login?error=institutional-email-required");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
