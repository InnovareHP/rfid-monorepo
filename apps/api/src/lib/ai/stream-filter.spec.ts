import { createStreamFilter } from "./stream-filter";

const run = (deltas: string[]) => {
  const filter = createStreamFilter();
  return deltas.map((delta) => filter.push(delta)).join("") + filter.flush();
};

describe("stream filter", () => {
  it("passes plain prose through unchanged", () => {
    expect(run(["Your requests ", "are listed on the requests page."])).toBe(
      "Your requests are listed on the requests page."
    );
  });

  it("suppresses a thinking block split across deltas", () => {
    expect(run(["<think", "ing>working", "</thinking>Answer."])).toBe(
      "Answer."
    );
  });

  it("never emits a partial tag while it could still complete", () => {
    const filter = createStreamFilter();

    expect(filter.push("Done. <thin")).toBe("Done. ");
    expect(filter.push("king>hidden</thinking> Visible.")).toBe(" Visible.");
  });

  it("drops leaked markup tags", () => {
    expect(run(["Click <button>here</button> now"])).toBe("Click here now");
  });

  it("drops urls without eating the following prose", () => {
    expect(run(["Go to https://example.com/path now"])).toBe("Go to  now");
  });

  it("drops markdown links", () => {
    expect(run(["See [the page](https://example.com) for more"])).toBe(
      "See  for more"
    );
  });

  it("keeps a plain bracket that is not a link", () => {
    expect(run(["Status [OPEN] means we are on it"])).toBe(
      "Status [OPEN] means we are on it"
    );
  });

  it("keeps words that merely start with h", () => {
    expect(run(["how ", "about here"])).toBe("how about here");
  });

  it("keeps arithmetic that is not a tag", () => {
    expect(run(["3 < 5 always"])).toBe("3 < 5 always");
  });

  it("releases a held tail on flush", () => {
    const filter = createStreamFilter();

    expect(filter.push("Ends with <thin")).toBe("Ends with ");
    expect(filter.flush()).toBe("<thin");
  });
});
