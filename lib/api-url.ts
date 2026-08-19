export function deriveApiBaseUrlFromHost(host: string): string {
  const hostname = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const apiHostname = hostname.replace(/^8081-/, "3000-");
  return apiHostname !== hostname ? `https://${apiHostname}` : "";
}
