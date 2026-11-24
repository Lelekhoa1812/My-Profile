import { describe, expect, it } from "vitest";
import { panelFrame, snapToSide } from "./place";

describe("snapToSide", () => {
  it("keeps a button on the right when it is already on the right", () => {
    expect(snapToSide({ x: 24, y: 40 }, 800)).toEqual({ x: 24, y: 40 });
  });

  it("opens the panel below the button when the button is near the top", () => {
    expect(panelFrame({ x: 24, y: 700 }, 800).openBelow).toBe(true);
    expect(panelFrame({ x: 24, y: 24 }, 800).openBelow).toBe(false);
  });

  it("moves a button to the left edge when its centre crosses the middle", () => {
    expect(snapToSide({ x: 700, y: 40 }, 800)).toEqual({ x: 720, y: 40 });
  });
});
