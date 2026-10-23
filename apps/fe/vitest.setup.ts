// jsdom has no layout APIs, which Radix and cmdk call on mount.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView ??= () => {};
}
