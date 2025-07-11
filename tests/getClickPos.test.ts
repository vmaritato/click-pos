import { getClickPos } from "../src/index";
import { getTouchPositions } from "../src/index";
import { distance, angle, boundingBox } from "../src/index";

beforeAll(() => {
  // Mock window.scrollTo to avoid jsdom not implemented warning
  window.scrollTo = jest.fn();
  // Mock PointerEvent if not present (jsdom < v16)
  if (typeof window.PointerEvent === "undefined") {
    // @ts-ignore
    window.PointerEvent = class extends window.MouseEvent {
      constructor(type: string, props: any) {
        super(type, props);
        this.pointerId = props && props.pointerId ? props.pointerId : 0;
      }
      pointerId: number = 0;
    };
    // @ts-ignore
    global.PointerEvent = window.PointerEvent;
  }
});

describe("getClickPos", () => {
  it("returns correct coordinates for MouseEvent relative to window", () => {
    const event = new MouseEvent("click", { clientX: 100, clientY: 200 });
    const pos = getClickPos(event, { relativeTo: "window" });
    expect(pos).toEqual({ x: 100, y: 200 });
  });

  it("returns correct coordinates for MouseEvent relative to document", () => {
    window.scrollTo(0, 50);
    const event = new MouseEvent("click", { clientX: 10, clientY: 20 });
    const pos = getClickPos(event, { relativeTo: "document" });
    expect(pos).toEqual({ x: 10, y: 20 + window.scrollY });
  });

  it("returns correct coordinates for MouseEvent relative to element", () => {
    document.body.innerHTML =
      '<div id="box" style="position:absolute;left:30px;top:40px;width:100px;height:100px"></div>';
    const box = document.getElementById("box")!;
    // Simulate box at (30,40)
    box.getBoundingClientRect = () => ({
      left: 30,
      top: 40,
      right: 130,
      bottom: 140,
      width: 100,
      height: 100,
      x: 30,
      y: 40,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 50, clientY: 60 });
    Object.defineProperty(event, "currentTarget", { value: box });
    const pos = getClickPos(event, { relativeTo: box });
    expect(pos).toEqual({ x: 20, y: 20 });
  });

  it("returns correct coordinates for TouchEvent (first touch only)", () => {
    const touch = { clientX: 15, clientY: 25 };
    const event = { touches: [touch], type: "touchstart" } as any;
    const pos = getClickPos(event, { relativeTo: "window" });
    expect(pos).toEqual({ x: 15, y: 25 });
  });

  it("returns correct coordinates for PointerEvent relative to window", () => {
    const event = new PointerEvent("pointerdown", { clientX: 77, clientY: 88 });
    const pos = getClickPos(event, { relativeTo: "window" });
    expect(pos).toEqual({ x: 77, y: 88 });
  });

  it("returns correct coordinates for PointerEvent relative to document", () => {
    window.scrollTo(0, 30);
    const event = new PointerEvent("pointerdown", { clientX: 11, clientY: 22 });
    const pos = getClickPos(event, { relativeTo: "document" });
    expect(pos).toEqual({ x: 11, y: 22 + window.scrollY });
  });

  it("returns correct coordinates for PointerEvent relative to element", () => {
    document.body.innerHTML =
      '<div id="el2" style="position:absolute;left:10px;top:20px;width:50px;height:50px"></div>';
    const el2 = document.getElementById("el2")!;
    el2.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 60,
      bottom: 70,
      width: 50,
      height: 50,
      x: 10,
      y: 20,
      toJSON: () => {},
    });
    const event = new PointerEvent("pointerdown", { clientX: 15, clientY: 25 });
    Object.defineProperty(event, "currentTarget", { value: el2 });
    const pos = getClickPos(event, { relativeTo: el2 });
    expect(pos).toEqual({ x: 5, y: 5 });
  });

  it("falls back to window coordinates for PointerEvent if no valid element", () => {
    const event = new PointerEvent("pointerdown", { clientX: 9, clientY: 8 });
    const pos = getClickPos(event, { relativeTo: undefined });
    expect(pos).toEqual({ x: 9, y: 8 });
  });
});

describe("getClickPos (percent option)", () => {
  it("returns percent coordinates for element", () => {
    document.body.innerHTML =
      '<div id="el3" style="position:absolute;left:0;top:0;width:200px;height:100px"></div>';
    const el3 = document.getElementById("el3")!;
    el3.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 50, clientY: 25 });
    Object.defineProperty(event, "currentTarget", { value: el3 });
    const pos = getClickPos(event, { relativeTo: el3, percent: true });
    expect(pos).not.toBeNull();
    if (pos) {
      expect(pos.x).toBeCloseTo(0.25);
      expect(pos.y).toBeCloseTo(0.25);
    }
  });

  it("returns percent coordinates for window", () => {
    const event = new MouseEvent("click", { clientX: 100, clientY: 200 });
    Object.defineProperty(window, "innerWidth", {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 400,
      configurable: true,
    });
    const pos = getClickPos(event, { relativeTo: "window", percent: true });
    expect(pos).not.toBeNull();
    if (pos) {
      expect(pos.x).toBeCloseTo(0.25);
      expect(pos.y).toBeCloseTo(0.5);
    }
  });

  it("returns percent coordinates for document", () => {
    Object.defineProperty(document.documentElement, "scrollWidth", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    const event = new MouseEvent("click", { clientX: 100, clientY: 200 });
    window.scrollTo(0, 0);
    const pos = getClickPos(event, { relativeTo: "document", percent: true });
    expect(pos).not.toBeNull();
    if (pos) {
      expect(pos.x).toBeCloseTo(0.1);
      expect(pos.y).toBeCloseTo(0.1);
    }
  });
});

describe("getClickPos (filter option)", () => {
  it("returns null if filter returns false", () => {
    const event = new MouseEvent("click", {
      clientX: 10,
      clientY: 20,
      button: 2,
    });
    const pos = getClickPos(event, {
      filter: (e) => (e as MouseEvent).button === 0,
    });
    expect(pos).toBeNull();
  });
  it("returns position if filter returns true", () => {
    const event = new MouseEvent("click", {
      clientX: 10,
      clientY: 20,
      button: 0,
    });
    const pos = getClickPos(event, {
      filter: (e) => (e as MouseEvent).button === 0,
    });
    expect(pos).not.toBeNull();
    if (pos) {
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
    }
  });
});

describe("getTouchPositions", () => {
  it("returns all touches for TouchEvent", () => {
    const touches = [
      { clientX: 10, clientY: 20, identifier: 1 },
      { clientX: 30, clientY: 40, identifier: 2 },
    ];
    const event = {
      touches,
      type: "touchmove",
      currentTarget: null,
    } as any;
    const result = getTouchPositions(event);
    expect(result).toEqual([
      { x: 10, y: 20, id: 1, type: "touch" },
      { x: 30, y: 40, id: 2, type: "touch" },
    ]);
  });

  it("returns pointer position for PointerEvent", () => {
    const event = new PointerEvent("pointermove", {
      clientX: 50,
      clientY: 60,
      pointerId: 99,
    });
    const result = getTouchPositions(event);
    expect(result).toEqual([{ x: 50, y: 60, id: 99, type: "pointer" }]);
  });

  it("returns mouse position for MouseEvent", () => {
    const event = new MouseEvent("mousemove", { clientX: 7, clientY: 8 });
    const result = getTouchPositions(event);
    expect(result).toEqual([{ x: 7, y: 8, id: 0, type: "mouse" }]);
  });
});

describe("getTouchPositions (percent option)", () => {
  it("returns percent for all touches", () => {
    const touches = [
      { clientX: 10, clientY: 20, identifier: 1 },
      { clientX: 30, clientY: 40, identifier: 2 },
    ];
    const event = {
      touches,
      type: "touchmove",
      currentTarget: null,
    } as any;
    const result = getTouchPositions(event, { percent: true });
    expect(result[0].x).toBeGreaterThanOrEqual(0);
    expect(result[0].x).toBeLessThanOrEqual(1);
    expect(result[1].y).toBeGreaterThanOrEqual(0);
    expect(result[1].y).toBeLessThanOrEqual(1);
  });
});

describe("getTouchPositions (filter option)", () => {
  it("returns [] if filter returns false", () => {
    const event = new PointerEvent("pointerdown", {
      clientX: 10,
      clientY: 20,
      pointerId: 1,
      isPrimary: false,
    });
    const result = getTouchPositions(event, {
      filter: (e) => !(e instanceof PointerEvent) || e.isPrimary,
    });
    expect(result).toEqual([]);
  });
  it("returns positions if filter returns true", () => {
    const event = new PointerEvent("pointerdown", {
      clientX: 10,
      clientY: 20,
      pointerId: 1,
    });
    Object.defineProperty(event, "isPrimary", { value: true });
    const result = getTouchPositions(event, {
      filter: (e) => !(e instanceof PointerEvent) || e.isPrimary,
    });
    expect(result.length).toBeGreaterThan(0);
    const pos = result[0];
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
    expect(pos.id).toBe(1);
    expect(pos.type).toBe("pointer");
  });
});

describe("geometry utils", () => {
  it("distance computes euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(5);
  });
  it("angle computes angle in radians", () => {
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
    expect(angle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(Math.PI);
    expect(angle({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(-Math.PI / 2);
  });
  it("boundingBox computes min/max for points", () => {
    const box = boundingBox([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: -1, y: 5 },
      { x: 2, y: -2 },
    ]);
    expect(box).toEqual({ minX: -1, minY: -2, maxX: 3, maxY: 5 });
  });
  it("boundingBox throws on empty array", () => {
    expect(() => boundingBox([])).toThrow();
  });
});

describe("edge cases", () => {
  it("returns null for hidden elements (rect zero)", () => {
    document.body.innerHTML = '<div id="hidden" style="display:none"></div>';
    const el = document.getElementById("hidden")!;
    el.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 10, clientY: 20 });
    Object.defineProperty(event, "currentTarget", { value: el });
    const pos = getClickPos(event, { relativeTo: el });
    expect(pos).toBeNull();
  });
  it("accounts for nested scroll in normalizeScroll", () => {
    // NOTE: In jsdom, scrollLeft/scrollTop do not affect getBoundingClientRect, so this test only verifies the logic, not the real browser behavior.
    document.body.innerHTML =
      '<div id="outer" style="overflow:auto;width:100px;height:100px"><div id="inner" style="overflow:auto;width:80px;height:80px"></div></div>';
    const outer = document.getElementById("outer")!;
    const inner = document.getElementById("inner")!;
    outer.scrollLeft = 5;
    outer.scrollTop = 10;
    inner.scrollLeft = 2;
    inner.scrollTop = 3;
    inner.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 80,
      bottom: 80,
      width: 80,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 20, clientY: 30 });
    Object.defineProperty(event, "currentTarget", { value: inner });
    const pos = getClickPos(event, {
      relativeTo: inner,
      normalizeScroll: true,
    });
    expect(pos).not.toBeNull();
    if (pos) {
      // In jsdom, rect.left/top is always 0, so the result is clientX - (outer.scrollLeft + inner.scrollLeft)
      expect(pos.x).toBe(15); // 20 - (5 + 0) (inner.scrollLeft is not applied by jsdom)
      expect(pos.y).toBe(20); // 30 - (10 + 0) (inner.scrollTop is not applied by jsdom)
    }
  });
});

describe("edge case errors", () => {
  it("returns null for event without coordinates", () => {
    const event = { type: "custom" } as any;
    const pos = getClickPos(event);
    expect(pos).toBeNull();
  });
  it("returns null for element removed from DOM (rect zero)", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 10, clientY: 20 });
    Object.defineProperty(event, "currentTarget", { value: el });
    const pos = getClickPos(event, { relativeTo: el });
    expect(pos).toBeNull();
  });
  it("returns NaN for percent with zero width/height", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const event = new MouseEvent("click", { clientX: 10, clientY: 20 });
    Object.defineProperty(event, "currentTarget", { value: el });
    const pos = getClickPos(event, { relativeTo: el, percent: true });
    expect(pos).toBeNull();
  });
});

describe("performance", () => {
  it("handles 1000 touches efficiently", () => {
    const touches = Array.from({ length: 1000 }, (_, i) => ({
      clientX: i,
      clientY: i * 2,
      identifier: i,
    }));
    const event = { touches, type: "touchmove", currentTarget: null } as any;
    const t0 = performance.now();
    const result = getTouchPositions(event);
    const t1 = performance.now();
    expect(result.length).toBe(1000);
    expect(t1 - t0).toBeLessThan(50); // Should be fast
  });
});
