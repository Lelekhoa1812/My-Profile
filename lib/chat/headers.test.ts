import { describe, expect, it } from "vitest";
import { streamHeaders } from "./headers";

describe("streamHeaders", () => {
  it("names the record source and sets the visitor cookie on the first reply", () => {
    expect(streamHeaders("file", "visitor=abc")).toEqual({
      "x-profile-source": "file",
      "set-cookie": "visitor=abc",
    });
  });

  it("names a database record without a cookie on a return visit", () => {
    expect(streamHeaders("database")).toEqual({ "x-profile-source": "database" });
  });
});
