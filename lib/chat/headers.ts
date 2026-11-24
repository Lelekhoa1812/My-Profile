export function streamHeaders(source: "database" | "file", setCookie?: string): Record<string, string> {
  return {
    "x-profile-source": source,
    ...(setCookie ? { "set-cookie": setCookie } : {}),
  };
}
