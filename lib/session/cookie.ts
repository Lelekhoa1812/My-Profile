export function visitorCookie(id: string, secure: boolean): string {
  const secureFlag = secure ? "; Secure" : "";
  return `visitor=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secureFlag}`;
}
