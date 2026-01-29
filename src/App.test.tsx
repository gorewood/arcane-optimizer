import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
  });

  it("displays the app title", () => {
    render(<App />);
    expect(screen.getByText("Arcane Odyssey Armor Optimizer")).toBeInTheDocument();
  });

  it("displays both tab labels", () => {
    render(<App />);
    const tabs = screen.getAllByRole("button");
    const tabLabels = tabs.map((t) => t.textContent);
    expect(tabLabels).toContain("Gear Pool");
    expect(tabLabels).toContain("Optimizer");
  });
});
