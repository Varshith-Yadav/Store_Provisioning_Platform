let k8s: typeof import("@kubernetes/client-node");

export async function getCoreV1Api() {
  if (!k8s) {
    k8s = await import("@kubernetes/client-node");
  }

  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  return kc.makeApiClient(k8s.CoreV1Api);
}
