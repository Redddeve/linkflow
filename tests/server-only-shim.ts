// Shim for the 'server-only' package in test environments.
// In production Next.js, importing this throws if bundled for the client.
// In tests we just no-op it.
export {};
