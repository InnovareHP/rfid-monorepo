// A blind index answers "is this the same string" and nothing else, so a typo
// or an extra word is invisible to it. Similarity has to be measured on the
// plaintext, which means decrypting candidates and comparing here.

// Two measures, because each is blind to what the other catches:
//
//   bigrams - character overlap. Catches typos, appended junk and spelling
//             drift, but scores "Sunrise Care" against "Sunset Care" high
//             because the shared tail dominates.
//   tokens  - word overlap. Catches reordering and added or dropped words,
//             and correctly separates two facilities that differ only in the
//             one word that names them.
//
// Averaging them means a pair has to look alike both ways. That is what keeps
// "Maple Grove Nursing" and "Maple Ridge Nursing" apart while still catching
// "A Great Choice For Home Care Inc" and "A Great Choice For Home Care Inceee".
export const NAME_SIMILARITY_THRESHOLD = 0.8;

const bigrams = (value: string): string[] => {
  const pairs: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    pairs.push(value.slice(i, i + 2));
  }
  return pairs;
};

// Dice coefficient over character bigrams, counted as a multiset so a repeated
// pair cannot be matched twice.
const bigramScore = (a: string, b: string): number => {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.length || !right.length) return 0;

  const pool = new Map<string, number>();
  for (const pair of left) pool.set(pair, (pool.get(pair) ?? 0) + 1);

  let shared = 0;
  for (const pair of right) {
    const remaining = pool.get(pair) ?? 0;
    if (remaining > 0) {
      pool.set(pair, remaining - 1);
      shared += 1;
    }
  }

  return (2 * shared) / (left.length + right.length);
};

// Two words count as the same word below this. Loose enough for "center" and
// "centre" or "facility" and "faciliti", tight enough to keep "sunrise" apart
// from "sunset", which is the pair that decides how noisy this gets.
const SAME_WORD_THRESHOLD = 0.6;

// Jaccard over the word set, except a word can pair with a near spelling of
// itself. Exact set overlap drops to 0.5 when one word of three carries a
// typo, which is low enough to hide a real duplicate.
const tokenScore = (a: string, b: string): number => {
  const left = a.split(" ").filter(Boolean);
  const right = b.split(" ").filter(Boolean);
  if (!left.length || !right.length) return 0;

  const unmatched = [...right];
  let shared = 0;

  for (const token of left) {
    let bestIndex = -1;
    let bestScore = 0;

    unmatched.forEach((candidate, index) => {
      const score = candidate === token ? 1 : bigramScore(token, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0 && bestScore >= SAME_WORD_THRESHOLD) {
      unmatched.splice(bestIndex, 1);
      shared += 1;
    }
  }

  return shared / (left.length + right.length - shared);
};

// Both inputs must already be normalized the same way.
export const nameSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;
  if (a === b) return 1;

  return (bigramScore(a, b) + tokenScore(a, b)) / 2;
};
