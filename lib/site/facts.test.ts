import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public facts", () => {
  it("uses the public title and does not lead with product names", () => {
    const site = readFileSync("content/site.ts", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(site).toContain('title: "AI Software Engineer"');
    expect(layout).toContain("Dang Khoa Le · AI Software Engineer");
    expect(site).not.toContain("FoodFlow");
    expect(site).not.toContain("Copilot");
    expect(site).toContain('title: "Senior AI Software Engineer"');
  });

  it("uses the illustration stills", () => {
    const stills = readFileSync("components/site/stills.ts", "utf8");
    expect(stills).toContain("illustrations/clara.jpg");
    expect(stills).not.toContain('from "@/img/clara.jpeg"');
  });
});
