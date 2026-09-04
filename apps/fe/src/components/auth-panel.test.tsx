// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthPanel } from "./auth-panel";

describe("AuthPanel art panel", () => {
  it("serves webp with a png fallback", () => {
    const { container } = render(<AuthPanel>child</AuthPanel>);
    const source = container.querySelector("picture > source");

    expect(source?.getAttribute("srcset")).toBe("/login-page/Inner.webp");
    expect(source?.getAttribute("type")).toBe("image/webp");
    expect(container.querySelector("picture > img")?.getAttribute("src")).toBe(
      "/login-page/Inner.png"
    );
  });

  it("keeps the fill classes on picture, not just the img", () => {
    const { container } = render(<AuthPanel>child</AuthPanel>);
    const picture = container.querySelector("picture");

    // picture is inline by default, so dropping these collapses the art: the
    // img's h-full would resolve against a zero-height inline box.
    expect(picture?.className).toContain("block");
    expect(picture?.className).toContain("h-full");
    expect(picture?.className).toContain("w-full");
  });

  it("marks the art as the high priority image", () => {
    const { container } = render(<AuthPanel>child</AuthPanel>);
    const img = container.querySelector("picture > img");

    expect(img?.getAttribute("fetchpriority")).toBe("high");
    expect(img?.getAttribute("decoding")).toBe("async");
  });
});
