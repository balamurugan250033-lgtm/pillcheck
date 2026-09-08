export function fuzzyMatchScore(expected: Record<string, string | undefined>, detected: Record<string, string | undefined>): number {
  let matches = 0;
  let total = 0;
  const normalize = (v?: string) => (v || '').toLowerCase().trim();
  const keys = Object.keys(expected);
  keys.forEach(k => {
    if (expected[k] && detected[k]) {
      total += 2;
      if (normalize(expected[k]) === normalize(detected[k])) {
        matches += 2;
      } else if ((expected[k] || '').includes(detected[k] || '') || (detected[k] || '').includes(expected[k] || '')) {
        matches += 1;
      }
    } else if (expected[k] || detected[k]) {
      total += 1;
    }
  });
  if (total === 0) {
    return 0.5;
  }
  return matches / total;
}

export function computeVerdict(expected: Record<string, string | undefined>, detected: Record<string, string | undefined>): 'match' | 'mismatch' | 'uncertain' {
  const score = fuzzyMatchScore(expected, detected);
  if (score >= 0.85) {
    return 'match';
  }
  if (score <= 0.3) {
    return 'mismatch';
  }
  return 'uncertain';
}
