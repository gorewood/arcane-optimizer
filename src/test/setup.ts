import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Radix UI components (Slider, etc.)
global.ResizeObserver = class ResizeObserver {
  observe(): void {
    // noop
  }
  unobserve(): void {
    // noop
  }
  disconnect(): void {
    // noop
  }
};
