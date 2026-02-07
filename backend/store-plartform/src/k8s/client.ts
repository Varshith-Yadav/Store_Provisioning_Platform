let coreV1Api: any;

export async function getCoreV1Api() {
  if (coreV1Api) return coreV1Api;
  
  const k8s = await import("@kubernetes/client-node");
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  
  return coreV1Api;
}
