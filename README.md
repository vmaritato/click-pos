# click-pos

[![npm version](https://img.shields.io/npm/v/click-pos.svg?style=flat-square)](https://www.npmjs.com/package/click-pos)
[![license](https://img.shields.io/npm/l/click-pos?style=flat-square)](./LICENSE)
[![install size](https://packagephobia.com/badge?p=click-pos)](https://packagephobia.com/result?p=click-pos)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/click-pos?style=flat-square)](https://bundlephobia.com/package/click-pos)
[![npm downloads](https://img.shields.io/npm/dm/click-pos?style=flat-square)](https://www.npmjs.com/package/click-pos)
[![CI](https://github.com/vmaritato/click-pos/actions/workflows/ci.yml/badge.svg)](https://github.com/vmaritato/click-pos/actions)
[![Coverage Status](https://coveralls.io/repos/github/vmaritato/click-pos/badge.svg?branch=main)](https://coveralls.io/github/vmaritato/click-pos?branch=main)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

---

## Installation

Install via npm:

```sh
npm install click-pos
```

## Basic Usage

```ts
import { getClickPos } from "click-pos";

// Example: pointer event handler (recommended for full compatibility)
document.addEventListener("pointerdown", (event) => {
  const pos = getClickPos(event, { relativeTo: "window" });
  console.log(pos.x, pos.y); // Coordinates relative to the viewport
});
```

## API

### `getClickPos(event, options?)`

Returns the x/y coordinates of a click or touch event, relative to the window, document, or a specific HTML element.

#### **Parameters**

- `event: MouseEvent | TouchEvent | PointerEvent`  
  The event object from a click, touch, or pointer handler. Only the first touch is considered for multi-touch events.

- `options?: GetClickPosOptions`
  - `relativeTo?: 'window' | 'document' | HTMLElement`  
    Reference for the coordinates:
    - `'window'` (default): relative to the viewport (ignores scroll)
    - `'document'`: relative to the full page (includes scroll offset)
    - `HTMLElement`: relative to the top-left corner of the given element
  - `normalizeScroll?: boolean`  
    If `true`, subtracts the current scroll offset from the result (useful for fixed elements). Only applies when `relativeTo` is `'window'` or an `HTMLElement`.
  - `percent?: boolean`  
    If `true`, returns coordinates as a value between 0 and 1 (percentage relative to the reference: element, window, or document).
  - `filter?: (event) => boolean`  
    Optional callback to filter/validate the event. If it returns false, the function returns `null` (for `getClickPos`) or an empty array (for `getTouchPositions`).

#### **Returns**

- `{ x: number, y: number }`
  - `x`: The horizontal coordinate, in pixels (or percent if `percent: true`)
  - `y`: The vertical coordinate, in pixels (or percent if `percent: true`)

#### **Example: Relative to an element**

```ts
const element = document.getElementById("my-box");
element?.addEventListener("click", (event) => {
  const pos = getClickPos(event, { relativeTo: element });
  console.log(pos); // { x, y } relative to the element
});
```

#### **Robustness**

- Handles both `MouseEvent` and `TouchEvent` (uses only the first touch).
- If no valid target is provided, falls back to window coordinates.
- Handles scroll and bounding rect calculations precisely.

#### **Example: Filter only left mouse button**

```ts
const pos = getClickPos(event, {
  filter: (e) => !(e instanceof MouseEvent) || e.button === 0,
});
if (pos) {
  // Only left mouse button events are processed
}
```

#### **Example: Filter only primary pointer**

```ts
const touches = getTouchPositions(event, {
  filter: (e) => !(e instanceof PointerEvent) || e.isPrimary,
});
```

#### **Example: Relative to SVG**

```ts
const svg = document.getElementById("mysvg");
svg?.addEventListener("pointerdown", (event) => {
  const pos = getClickPos(event, { relativeTo: svg });
  // pos.x, pos.y are in SVG user coordinates
});
```

#### **Example: Percent coordinates for responsive drawing**

```ts
const pos = getClickPos(event, { relativeTo: element, percent: true });
// pos.x, pos.y are between 0 and 1, regardless of element size
```

#### **Example: Pinch/Zoom gesture detection**

```ts
import { getTouchPositions, distance } from "click-pos";

let lastDist = null;

document.addEventListener("touchmove", (event) => {
  const touches = getTouchPositions(event, { relativeTo: "element" });
  if (touches.length === 2) {
    const d = distance(touches[0], touches[1]);
    if (lastDist !== null) {
      if (d > lastDist) {
        console.log("Zooming out");
      } else {
        console.log("Zooming in");
      }
    }
    lastDist = d;
  }
});
```

#### **Example: SSR/Universal usage (Next.js, Astro, etc.)**

```ts
import { getClickPos } from "click-pos";

if (typeof window !== "undefined") {
  document.addEventListener("pointerdown", (event) => {
    const pos = getClickPos(event);
    // ...
  });
}
```

#### **Example: React integration**

```tsx
import { getClickPos } from "click-pos";

function MyComponent() {
  const ref = useRef(null);
  const handlePointerDown = (event) => {
    const pos = getClickPos(event, { relativeTo: ref.current });
    // ...
  };
  return (
    <div ref={ref} onPointerDown={handlePointerDown}>
      Click me
    </div>
  );
}
```

## Multi-touch & Advanced Pointer Support

### `getTouchPositions(event, options?)`

Returns an array of all active touch, pointer, or mouse positions for the given event.

- For **TouchEvent**: returns all active touches (multi-touch)
- For **PointerEvent**: returns the current pointer (future-proof for multi-pointer)
- For **MouseEvent**: returns a single position
- If `percent: true`, all positions are in percent (0-1) relative to the reference.

#### **Type**

```ts
export interface TouchPos {
  x: number;
  y: number;
  id: number | string; // touch.identifier, pointerId, or 0 for mouse
  type: "touch" | "pointer" | "mouse";
}
```

#### **Example: Multi-touch**

```ts
import { getTouchPositions } from "click-pos";

document.addEventListener("touchmove", (event) => {
  const touches = getTouchPositions(event, {
    relativeTo: "element",
    normalizeScroll: false,
  });
  touches.forEach((touch) => {
    console.log(`Touch ${touch.id}: x=${touch.x}, y=${touch.y}`);
  });
});
```

#### **Use cases**

- Multi-finger gestures (pinch, zoom, rotate)
- Drawing/painting apps
- Advanced pointer/stylus support

## Geometry Utilities

### `distance(a, b)`

Returns the Euclidean distance between two points `{x, y}`.

```ts
import { distance } from "click-pos";
distance({ x: 0, y: 0 }, { x: 3, y: 4 }); // 5
```

### `angle(a, b)`

Returns the angle (in radians) from point `a` to point `b` (0 = right, counterclockwise positive).

```ts
import { angle } from "click-pos";
angle({ x: 0, y: 0 }, { x: 0, y: 1 }); // ≈ Math.PI/2
```

### `boundingBox(points)`

Returns the bounding box `{ minX, minY, maxX, maxY }` for an array of points.

```ts
import { boundingBox } from "click-pos";
boundingBox([
  { x: 1, y: 2 },
  { x: 3, y: 4 },
]); // { minX: 1, minY: 2, maxX: 3, maxY: 4 }
```

## Edge Cases & Robustness

- **Hidden elements**: If the target element is hidden (`display: none`) or detached from the DOM, the function returns `null` (coordinates cannot be computed).
- **Nested scroll**: When using `normalizeScroll`, the scroll offset of all scrollable parent elements is taken into account, not just the window.
- **iframe**: Coordinates are always relative to the current window/document. For cross-frame calculations, you must handle coordinate translation manually (due to browser security restrictions).

## SSR & Non-DOM Environments

- The library is safe to import and use in Node.js, SSR, and non-browser environments.
- If called outside the browser (no `window`/`document`), all functions return `null` or an empty array, never throwing errors.
- This makes it safe for universal/isomorphic code and frameworks like Next.js, Nuxt, Astro, etc.

---

© 2024 Vincenzo Maritato — MIT License

## Framework Integration Examples

### React

```tsx
import { getClickPos } from "click-pos";
import { useRef } from "react";

function MyComponent() {
  const ref = useRef(null);
  const handlePointerDown = (event) => {
    const pos = getClickPos(event, { relativeTo: ref.current });
    // ...
  };
  return (
    <div ref={ref} onPointerDown={handlePointerDown}>
      Click me
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <div ref="box" @pointerdown="onPointerDown">Click me</div>
</template>

<script setup>
import { ref } from "vue";
import { getClickPos } from "click-pos";
const box = ref(null);
function onPointerDown(event) {
  const pos = getClickPos(event, { relativeTo: box.value });
  // ...
}
</script>
```

### Svelte

```svelte
<script>
  import { getClickPos } from 'click-pos';
  let box;
  function handlePointerDown(event) {
    const pos = getClickPos(event, { relativeTo: box });
    // ...
  }
</script>

<div bind:this={box} on:pointerdown={handlePointerDown}>
  Click me
</div>
```

### Angular

```ts
// my.component.ts
import { Component, ElementRef, ViewChild } from "@angular/core";
import { getClickPos } from "click-pos";

@Component({
  selector: "my-box",
  template: `<div #box (pointerdown)="onPointerDown($event)">Click me</div>`,
})
export class MyBoxComponent {
  @ViewChild("box") box!: ElementRef;
  onPointerDown(event: PointerEvent) {
    const pos = getClickPos(event, { relativeTo: this.box.nativeElement });
    // ...
  }
}
```
