import { getCoreV1Api } from "./client";

function normalizeHost(host?: string | null): string | null {
  if (!host) return null;
  return host.trim() || null;
}

export async function getServiceExternalUrl(
  namespace: string,
  serviceName: string,
  protocol: string
): Promise<string | null> {
  const coreApi = await getCoreV1Api();
  const response = await coreApi.readNamespacedService({
    namespace,
    name: serviceName
  });
  const service: any = (response as any).body ?? response;

  const ingress = service.status?.loadBalancer?.ingress?.[0];
  const host =
    normalizeHost(ingress?.ip) ??
    normalizeHost(ingress?.hostname) ??
    normalizeHost(service.spec?.externalIPs?.[0]);

  if (!host) return null;

  const port = service.spec?.ports?.[0]?.port;
  const needsPort = Boolean(port && port !== 80 && port !== 443);
  const portSuffix = needsPort ? `:${port}` : "";

  return `${protocol}://${host}${portSuffix}`;
}
