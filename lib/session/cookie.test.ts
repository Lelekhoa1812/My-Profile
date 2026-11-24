import { describe, expect, it } from "vitest";
import { visitorCookie } from "./cookie";

describe("visitor cookie", () => {
  it("adds Secure only on an https request", () => {
    expect(visitorCookie("abc123abc123abcd", false)).not.toContain("Secure");
    expect(visitorCookie("abc123abc123abcd", true)).toContain("; Secure");
  });
});
