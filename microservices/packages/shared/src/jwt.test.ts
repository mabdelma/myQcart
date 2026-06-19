import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import { signToken, verifyToken, verifyHs256, bearer } from "./jwt";

const SECRET = "test-secret-shared-by-monolith-and-services";

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
});

// Build a STANDARD HS256 JWT the way the monolith (hono/jwt) does — exp in SECONDS.
function monolithJwt(payload: Record<string, unknown>, secret = SECRET): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

describe("signToken / verifyToken (compact service tokens)", () => {
  it("round-trips valid claims", () => {
    const token = signToken({ sub: "u1", role: "admin", tenantId: "t1", email: "a@b.co" });
    const claims = verifyToken(token);
    expect(claims).toMatchObject({ sub: "u1", role: "admin", tenantId: "t1", email: "a@b.co" });
    expect(typeof claims!.exp).toBe("number");
  });

  it("rejects a tampered payload", () => {
    const token = signToken({ sub: "u1", role: "admin" });
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "u1", role: "super_admin", exp: Date.now() + 1000 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signToken({ sub: "u1", ttlMs: -1000 });
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signToken({ sub: "u1" });
    process.env.AUTH_SECRET = "a-different-secret";
    expect(verifyToken(token)).toBeNull();
    process.env.AUTH_SECRET = SECRET;
  });

  it("rejects null / malformed input", () => {
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken("not-a-token")).toBeNull();
  });
});

describe("verifyHs256 (monolith-compatible tokens)", () => {
  it("verifies a monolith HS256 token (exp in seconds)", () => {
    const token = monolithJwt({ sub: "u1", userId: "u1", role: "manager", tenantId: "t1", exp: Math.floor(Date.now() / 1000) + 3600 });
    const claims = verifyHs256(token);
    expect(claims).toMatchObject({ sub: "u1", role: "manager", tenantId: "t1" });
  });

  it("rejects an expired monolith token", () => {
    const token = monolithJwt({ sub: "u1", role: "admin", tenantId: "t1", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(verifyHs256(token)).toBeNull();
  });

  it("rejects a bad signature", () => {
    const token = monolithJwt({ sub: "u1", role: "admin", tenantId: "t1", exp: Math.floor(Date.now() / 1000) + 3600 }, "wrong-secret");
    expect(verifyHs256(token)).toBeNull();
  });

  it("rejects non-three-part tokens", () => {
    expect(verifyHs256("a.b")).toBeNull();
    expect(verifyHs256(null)).toBeNull();
  });
});

describe("bearer", () => {
  it("extracts the token from an Authorization header", () => {
    expect(bearer("Bearer abc.def")).toBe("abc.def");
    expect(bearer("bearer abc")).toBe("abc"); // case-insensitive
  });
  it("returns null when absent or malformed", () => {
    expect(bearer(null)).toBeNull();
    expect(bearer("Basic xyz")).toBeNull();
  });
});
