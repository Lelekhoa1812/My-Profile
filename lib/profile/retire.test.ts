import { describe, expect, it } from "vitest";
import { idsToRetire } from "./retire";

describe("ids to retire", () => {
  it("drops a stored id that left the profile", () => {
    expect(idsToRetire(["role-axion", "role-old"], ["role-axion"])).toEqual(["role-old"]);
  });

  it("keeps every id that is still in the profile", () => {
    expect(idsToRetire(["skills"], ["skills", "role-axion"])).toEqual([]);
  });
});
