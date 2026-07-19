export function nextSkipCount(currentCount: number): number {
  return currentCount + 1;
}

export function shouldAskRelevance(skipCount: number, threshold = 2): boolean {
  return skipCount >= threshold;
}
