export function mergeProblemReasonTags(currentReason: string, previousTags: string[], nextTags: string[]) {
  const previous = new Set(previousTags);
  const manualSegments = currentReason
    .split(/[，,]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment && !previous.has(segment));
  return [...new Set([...nextTags, ...manualSegments])].join('，');
}

export function normalizeProblemReasonInput(currentReason: string, selectedTags: string[], nextReason: string) {
  const selectedPrefix = selectedTags.join('，');
  const appendedText = selectedPrefix && currentReason === selectedPrefix && nextReason.startsWith(selectedPrefix)
    ? nextReason.slice(selectedPrefix.length)
    : '';
  return appendedText && !/^[，,]/.test(appendedText)
    ? `${selectedPrefix}，${appendedText}`
    : nextReason;
}
