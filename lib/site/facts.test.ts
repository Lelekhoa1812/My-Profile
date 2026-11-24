import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public facts", () => {
  it("keeps the current resume title and the FoodFlow split", () => {
    const site = readFileSync("content/site.ts", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(site).toContain('title: "Senior AI Software Engineer"');
    expect(layout).toContain("Dang Khoa Le · Senior AI Software Engineer");
    expect(site).toContain("FoodFlow is the multi-tenant ERP");
  });

  it("uses the product stills, not a stock stand-in", () => {
    const stills = readFileSync("components/site/stills.ts", "utf8");
    expect(stills).not.toContain("illustrations/");
    expect(stills).toContain('from "@/img/clara.jpeg"');
  });
});
