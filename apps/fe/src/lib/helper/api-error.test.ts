import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./helper";

describe("getApiErrorMessage", () => {
  it("reads a plain Nest error body", () => {
    const error = {
      response: {
        data: { message: "Bad range", error: "Bad Request", statusCode: 400 },
      },
    };
    expect(getApiErrorMessage(error, "fallback")).toBe("Bad range");
  });

  it("unwraps a Nest body nested under message", () => {
    const error = {
      response: {
        data: {
          message: {
            message: "Upstream failed",
            error: "Bad Request",
            statusCode: 400,
          },
          error: "Bad Request",
          statusCode: 400,
        },
      },
    };
    expect(getApiErrorMessage(error, "fallback")).toBe("Upstream failed");
  });

  it("takes the first entry of a validation message array", () => {
    const error = {
      response: { data: { message: ["name must be a string"] } },
    };
    expect(getApiErrorMessage(error, "fallback")).toBe("name must be a string");
  });

  it("falls back to the error's own message when there is no response", () => {
    expect(getApiErrorMessage(new Error("Network down"), "fallback")).toBe(
      "Network down"
    );
  });

  it("returns the fallback when nothing usable is present", () => {
    expect(getApiErrorMessage({ response: { data: {} } }, "fallback")).toBe(
      "fallback"
    );
    expect(getApiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("survives a self-referencing error object", () => {
    const data: Record<string, unknown> = { statusCode: 500 };
    data.message = data;
    expect(getApiErrorMessage({ response: { data } }, "fallback")).toBe(
      "fallback"
    );
  });
});
