/**
 * click-pos
 *
 * A tiny TypeScript library to easily and precisely get x/y coordinates from click or touch events,
 * relative to the window, document, or any HTML element. Lightweight, fast, compatible with all modern browsers,
 * and designed to be easily integrated into JavaScript and TypeScript projects, including frameworks like React.
 *
 * @author Vincenzo Maritato
 * @license MIT
 */

/**
 * Determines the reference for the returned coordinates.
 * - 'window': relative to the viewport (default)
 * - 'document': relative to the full page
 * - HTMLElement: relative to a specific element
 */
export type RelativeTo = "window" | "document" | HTMLElement;

/**
 * Options for getClickPos.
 * @property relativeTo Reference for the coordinates ('window', 'document', or an HTMLElement)
 * @property normalizeScroll If true, subtracts scroll offset (for fixed elements)
 * @property percent If true, returns coordinates as a value between 0 and 1 (percentage relative to the reference)
 * @property filter Optional callback to filter/validate the event. If returns false, the function returns null (or [] for getTouchPositions).
 */
export interface GetClickPosOptions {
  relativeTo?: RelativeTo;
  normalizeScroll?: boolean;
  percent?: boolean;
  filter?: (event: MouseEvent | TouchEvent | PointerEvent) => boolean;
}

/**
 * The output of getClickPos: x/y coordinates in pixels.
 * @property x Horizontal coordinate
 * @property y Vertical coordinate
 */
export interface ClickPos {
  x: number;
  y: number;
}

/**
 * Represents a single touch, pointer, or mouse position.
 * @property x Horizontal coordinate
 * @property y Vertical coordinate
 * @property id Unique identifier (touch.identifier, pointerId, or 0 for mouse)
 * @property type 'touch' | 'pointer' | 'mouse'
 */
export interface TouchPos {
  x: number;
  y: number;
  id: number | string;
  type: "touch" | "pointer" | "mouse";
}

/**
 * Returns the x/y coordinates of a MouseEvent, TouchEvent, or PointerEvent relative to window, document, or a specific element.
 *
 * @param event MouseEvent, TouchEvent, or PointerEvent (only the first touch is considered for multi-touch)
 * @param options Optional settings:
 *   - relativeTo: 'window' | 'document' | HTMLElement (default: 'window')
 *   - normalizeScroll: boolean (default: false)
 * @returns { x, y } coordinates in pixels
 *
 * @example
 * document.addEventListener('pointerdown', (event) => {
 *   const pos = getClickPos(event, { relativeTo: 'document' });
 *   console.log(pos.x, pos.y);
 * });
 */
export function getClickPos(
  event: MouseEvent | TouchEvent | PointerEvent,
  options: GetClickPosOptions = {},
): ClickPos | null {
  // SSR/Non-DOM: return null if window or document are not defined
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (options.filter && !options.filter(event)) {
    return null;
  }
  // Use only the first touch for multi-touch events
  let clientX: number | undefined, clientY: number | undefined;
  if ("touches" in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if ("clientX" in event && "clientY" in event) {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  if (typeof clientX !== "number" || typeof clientY !== "number") {
    return null;
  }

  const {
    relativeTo = "window",
    normalizeScroll = false,
    percent = false,
  } = options;

  if (relativeTo === "window") {
    // Coordinates relative to the viewport
    let x = clientX;
    let y = clientY;
    if (normalizeScroll) {
      x -= window.scrollX;
      y -= window.scrollY;
    }
    if (percent) {
      x = x / window.innerWidth;
      y = y / window.innerHeight;
    }
    return { x, y };
  }

  if (relativeTo === "document") {
    // Coordinates relative to the full page (including scroll offset)
    let x = clientX + window.scrollX;
    let y = clientY + window.scrollY;
    if (percent) {
      x = x / document.documentElement.scrollWidth;
      y = y / document.documentElement.scrollHeight;
    }
    return { x, y };
  }

  // HTMLElement case
  let element: HTMLElement | null = null;
  if (relativeTo instanceof HTMLElement) {
    element = relativeTo;
  } else if (
    "currentTarget" in event &&
    event.currentTarget instanceof HTMLElement
  ) {
    // Fallback: use event.currentTarget if available
    element = event.currentTarget;
  }

  if (element) {
    // SVG support: if element is SVGGraphicsElement, use getScreenCTM
    if (
      typeof window.SVGGraphicsElement !== "undefined" &&
      element instanceof window.SVGGraphicsElement &&
      typeof element.getScreenCTM === "function"
    ) {
      const ctm = element.getScreenCTM();
      if (ctm) {
        // Use DOMPoint if available, otherwise SVGPoint
        let point;
        if (typeof window.DOMPoint === "function") {
          point = new window.DOMPoint(clientX, clientY);
        } else if (
          element.ownerSVGElement &&
          typeof element.ownerSVGElement.createSVGPoint === "function"
        ) {
          point = element.ownerSVGElement.createSVGPoint();
          point.x = clientX;
          point.y = clientY;
        }
        if (point && typeof point.matrixTransform === "function") {
          const svgPoint = point.matrixTransform(ctm.inverse());
          let x = svgPoint.x;
          let y = svgPoint.y;
          if (
            percent &&
            "width" in element &&
            "height" in element &&
            element.width &&
            element.height
          ) {
            let width = element.width;
            let height = element.height;
            if (
              typeof width === "object" &&
              width !== null &&
              "baseVal" in width &&
              typeof (width as any).baseVal === "object" &&
              (width as any).baseVal !== null &&
              "value" in (width as any).baseVal &&
              typeof (width as any).baseVal.value === "number"
            ) {
              width = (width as any).baseVal.value;
            }
            if (
              typeof height === "object" &&
              height !== null &&
              "baseVal" in height &&
              typeof (height as any).baseVal === "object" &&
              (height as any).baseVal !== null &&
              "value" in (height as any).baseVal &&
              typeof (height as any).baseVal.value === "number"
            ) {
              height = (height as any).baseVal.value;
            }
            x = x / (typeof width === "number" ? width : 1);
            y = y / (typeof height === "number" ? height : 1);
          }
          return { x, y };
        }
      }
    }
    // Use getBoundingClientRect for precise element position
    const rect = element.getBoundingClientRect();
    // Hidden elements: bounding rect is zero
    if (rect.width === 0 && rect.height === 0) {
      return null; // Cannot compute coordinates for hidden or detached elements
    }
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    // Nested scroll: sum scroll offsets of all scrollable parents
    let parent = element.parentElement;
    let scrollX = 0,
      scrollY = 0;
    while (
      parent &&
      parent !== document.body &&
      parent !== document.documentElement
    ) {
      scrollX += parent.scrollLeft || 0;
      scrollY += parent.scrollTop || 0;
      parent = parent.parentElement;
    }
    if (normalizeScroll) {
      x -= window.scrollX + scrollX;
      y -= window.scrollY + scrollY;
    }
    if (percent) {
      x = x / rect.width;
      y = y / rect.height;
    }
    return { x, y };
  }

  // If no valid element, fallback to window coordinates
  // (this is a safe fallback for robustness)
  return { x: clientX, y: clientY };
}

/**
 * Returns an array of all active touch, pointer, or mouse positions for the given event.
 *
 * - For TouchEvent: returns all active touches.
 * - For PointerEvent: returns the current pointer (multi-pointer not natively supported in browsers, but API is future-proof).
 * - For MouseEvent: returns a single position.
 *
 * @param event MouseEvent, TouchEvent, or PointerEvent
 * @param options Same options as getClickPos (relativeTo, normalizeScroll)
 * @returns Array of TouchPos objects
 */
export function getTouchPositions(
  event: MouseEvent | TouchEvent | PointerEvent,
  options: GetClickPosOptions = {},
): TouchPos[] {
  // SSR/Non-DOM: return [] if window or document are not defined
  if (typeof window === "undefined" || typeof document === "undefined") {
    return [];
  }
  if (options.filter && !options.filter(event)) {
    return [];
  }
  const {
    relativeTo = "window",
    normalizeScroll = false,
    percent = false,
  } = options;
  const positions: TouchPos[] = [];

  if ("touches" in event && event.touches.length > 0) {
    // TouchEvent: all active touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      // Estraggo manualmente le coordinate dal Touch
      const pos = getClickPos(
        {
          clientX: touch.clientX,
          clientY: touch.clientY,
          currentTarget: (event as TouchEvent)
            .currentTarget as HTMLElement | null,
        } as MouseEvent,
        { relativeTo, normalizeScroll, percent },
      );
      if (pos) {
        // Only push if getClickPos returned a valid position
        positions.push({
          ...pos,
          id: touch.identifier,
          type: "touch",
        });
      }
    }
    return positions;
  }

  if ("pointerId" in event) {
    // PointerEvent: only the current pointer (multi-pointer not natively supported in browsers)
    const pos = getClickPos(event, { relativeTo, normalizeScroll, percent });
    if (pos) {
      // Only push if getClickPos returned a valid position
      positions.push({
        ...pos,
        id: event.pointerId,
        type: "pointer",
      });
    }
    return positions;
  }

  // MouseEvent fallback
  const pos = getClickPos(event, { relativeTo, normalizeScroll, percent });
  if (pos) {
    // Only push if getClickPos returned a valid position
    positions.push({
      ...pos,
      id: 0,
      type: "mouse",
    });
  }
  return positions;
}

/**
 * Returns the Euclidean distance between two points.
 * @param a First point ({x, y})
 * @param b Second point ({x, y})
 * @returns Distance in the same unit as the input
 */
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns the angle (in radians) from point a to point b.
 * 0 is along the positive X axis, counterclockwise is positive.
 * @param a First point ({x, y})
 * @param b Second point ({x, y})
 * @returns Angle in radians
 */
export function angle(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Returns the bounding box of an array of points.
 * @param points Array of points ({x, y})
 * @returns { minX, minY, maxX, maxY }
 */
export function boundingBox(points: Array<{ x: number; y: number }>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (!points.length) throw new Error("No points provided");
  let minX = points[0].x,
    maxX = points[0].x,
    minY = points[0].y,
    maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
