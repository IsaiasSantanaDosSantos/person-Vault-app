import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({}));
    limit = limitMock;
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(_config: unknown) {}
  },
}));

import { checkShareRateLimit, getClientIp } from "./rateLimit";

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  limitMock.mockReset();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
});

describe("getClientIp", () => {
  it("usa o primeiro IP de x-forwarded-for quando há vários", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("cai pra x-real-ip quando x-forwarded-for não existe", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  it("devolve 'unknown' quando nenhum header existe", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("checkShareRateLimit", () => {
  it("libera (no-op) quando as env vars do Upstash não estão configuradas", async () => {
    const result = await checkShareRateLimit(new Headers());
    expect(result).toBe(true);
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("bloqueia quando o limiter reporta success: false", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    limitMock.mockResolvedValue({ success: false });

    const result = await checkShareRateLimit(new Headers({ "x-forwarded-for": "1.1.1.1" }));
    expect(result).toBe(false);
  });

  it("libera quando o limiter reporta success: true", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    limitMock.mockResolvedValue({ success: true });

    const result = await checkShareRateLimit(new Headers({ "x-forwarded-for": "1.1.1.1" }));
    expect(result).toBe(true);
  });

  it("falha aberta (libera) se o Upstash der erro", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    limitMock.mockRejectedValue(new Error("timeout"));

    const result = await checkShareRateLimit(new Headers({ "x-forwarded-for": "1.1.1.1" }));
    expect(result).toBe(true);
  });
});
