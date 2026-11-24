import { describe, expect, it } from "vitest";
import { snapToSide } from "./place";

describe("snapToSide", () => {
  it("keeps a button on the right when it is already on the right", () => {
    expect(snapToSide({ x: 24, y: 40 }, 800)).toEqual({ x: 24, y: 40 });
  });

  it("moves a button to the left edge when its centre crosses the middle", () => {
    expect(snapToSide({ x: 700, y: 40 }, 800)).toEqual({ x: 720, y: 40 });
  });
});
