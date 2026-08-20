// A suppressed pattern can split across two deltas, so anything that could still
// grow into one is held back rather than emitted and retracted on screen.
const RISKY = /[<[h]/;
const THINKING_OPEN = "<thinking>";
const THINKING_CLOSE = "</thinking>";
const URL_PREFIXES = ["http://", "https://"];

// Nothing legitimate is held this long; past it the tail was ordinary prose.
const MAX_HOLD = 200;

type Decision = {
  emit: string;
  hold: string;
  drop: number;
  thinking?: boolean;
};

function isPrefixOf(tail: string, full: string) {
  return full.startsWith(tail) && tail.length < full.length;
}

function decideTag(tail: string): Decision {
  if (isPrefixOf(tail, THINKING_OPEN)) return { emit: "", hold: tail, drop: 0 };
  if (tail.startsWith(THINKING_OPEN)) {
    return { emit: "", hold: "", drop: THINKING_OPEN.length, thinking: true };
  }

  const close = tail.indexOf(">");
  if (close >= 0) return { emit: "", hold: "", drop: close + 1 };
  // Only a tag-shaped tail is worth holding; "a < b" is arithmetic.
  return /^<[a-z/!]/i.test(tail) || tail === "<"
    ? { emit: "", hold: tail, drop: 0 }
    : { emit: tail[0], hold: "", drop: 0 };
}

function decideLink(tail: string): Decision {
  const label = tail.indexOf("]");
  if (label < 0) return { emit: "", hold: tail, drop: 0 };
  if (tail[label + 1] !== "(") {
    // A plain bracket, not a markdown link.
    return { emit: tail.slice(0, label + 1), hold: "", drop: 0 };
  }
  const end = tail.indexOf(")", label);
  if (end < 0) return { emit: "", hold: tail, drop: 0 };
  return { emit: "", hold: "", drop: end + 1 };
}

function decideUrl(tail: string): Decision {
  const matches = URL_PREFIXES.some(
    (prefix) => isPrefixOf(tail, prefix) || tail.startsWith(prefix)
  );
  if (!matches) return { emit: tail[0], hold: "", drop: 0 };

  const complete = URL_PREFIXES.some((prefix) => tail.startsWith(prefix));
  if (!complete) return { emit: "", hold: tail, drop: 0 };

  const end = tail.search(/\s/);
  if (end < 0) return { emit: "", hold: tail, drop: 0 };
  return { emit: "", hold: "", drop: end };
}

export function createStreamFilter() {
  let buffer = "";
  let inThinking = false;

  const drain = (final: boolean): string => {
    let out = "";

    for (;;) {
      if (inThinking) {
        const close = buffer.indexOf(THINKING_CLOSE);
        if (close < 0) {
          if (final) buffer = "";
          return out;
        }
        buffer = buffer.slice(close + THINKING_CLOSE.length);
        inThinking = false;
        continue;
      }

      const risky = buffer.search(RISKY);
      if (risky < 0) {
        out += buffer;
        buffer = "";
        return out;
      }

      out += buffer.slice(0, risky);
      const tail = buffer.slice(risky);

      const decision =
        tail[0] === "<"
          ? decideTag(tail)
          : tail[0] === "["
            ? decideLink(tail)
            : decideUrl(tail);

      if (decision.thinking) inThinking = true;

      if (!decision.emit && !decision.drop) {
        // Held: release it only once it is clear no pattern will complete.
        if (final || tail.length > MAX_HOLD) {
          out += tail;
          buffer = "";
          return out;
        }
        buffer = tail;
        return out;
      }

      out += decision.emit;
      buffer = tail.slice(decision.emit.length + decision.drop);
    }
  };

  return {
    push(delta: string): string {
      buffer += delta;
      return drain(false);
    },
    flush(): string {
      return drain(true);
    },
  };
}
