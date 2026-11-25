import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ArchiveItem = { title: string; committed: string };

describe("public archive order", () => {
  it("lists the newest commit first", () => {
    const archive = JSON.parse(readFileSync("content/archive.json", "utf8")) as { items: ArchiveItem[] };
    const stamps = archive.items.map((item) => item.committed);
    const sorted = [...stamps].sort((left, right) => (left < right ? 1 : left > right ? -1 : 0));
    expect(stamps).toEqual(sorted);
    expect(archive.items[0]?.committed).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
