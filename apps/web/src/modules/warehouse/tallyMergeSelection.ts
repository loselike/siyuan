export function areAllTallyMergeSourcesSelected(sourceIds: string[], selectedIds: string[]) {
  return sourceIds.length > 0 && sourceIds.every((sourceId) => selectedIds.includes(sourceId));
}

export function toggleAllTallyMergeSources(sourceIds: string[], selectedIds: string[]) {
  return areAllTallyMergeSourcesSelected(sourceIds, selectedIds) ? [] : [...sourceIds];
}
