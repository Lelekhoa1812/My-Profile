export type Point = { x: number; y: number };

export function snapToSide(place: Point, width: number, button = 56): Point {
  const center = width - place.x - button / 2;
  const onLeft = center < width / 2;
  return { x: onLeft ? width - button - 24 : 24, y: place.y };
}
