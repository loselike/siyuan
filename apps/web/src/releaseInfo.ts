const configuredReleaseId = import.meta.env.VITE_RELEASE_ID?.trim();

// Vite replaces this at build time. Local development intentionally remains
// identifiable instead of pretending to be a deployable release artifact.
export const clientReleaseId = configuredReleaseId || 'local-dev';
