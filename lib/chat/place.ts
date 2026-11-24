export type Point = { x: number; y: number };

export function panelFrame(place: Point, viewportHeight: number, button = 56, edge = 16, gap = 12) {
  const spaceAbove = viewportHeight - place.y - button - gap - edge;
  const spaceBelow = place.y - gap - edge;
  const openBelow = spaceAbove < 280 && spaceBelow > spaceAbove;
  const height = Math.min(544, Math.max(160, openBelow ? spaceBelow : spaceAbove));
  const bottom = openBelow ? edge : place.y + button + gap;
  return { height, bottom, openBelow };
}

export function snapToSide(place: Point, width: number, button = 56): Point {
  const center = width - place.x - button / 2;
  const onLeft = center < width / 2;
  return { x: onLeft ? width - button - 24 : 24, y: place.y };
}
