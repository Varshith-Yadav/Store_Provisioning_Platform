import { getCoreV1Api } from "../k8s/client";

export async function isWordPressReady(namespace: string): Promise<boolean> {
  const coreApi = await getCoreV1Api();
  const pods = await coreApi.listNamespacedPod({ namespace });

  const wpPod = pods.items.find(p =>
    p.metadata?.name?.includes("wordpress")
  );

  if (!wpPod) return false;
  if (wpPod.status?.phase !== "Running") return false;

  const containers = wpPod.status.containerStatuses || [];
  return containers.every(c => c.ready);
}

function hasReadyPod(pods: { items: any[] }): boolean {
  return pods.items.some(pod => {
    if (pod.status?.phase !== "Running") return false;
    const containers = pod.status?.containerStatuses || [];
    return containers.length > 0 && containers.every((c: any) => c.ready);
  });
}

export async function isMedusaReady(namespace: string): Promise<boolean> {
  const coreApi = await getCoreV1Api();
  const apiPods = await coreApi.listNamespacedPod({
    namespace,
    labelSelector: "app.kubernetes.io/component=api"
  });
  const uiPods = await coreApi.listNamespacedPod({
    namespace,
    labelSelector: "app.kubernetes.io/component=storefront"
  });

  return hasReadyPod(apiPods) && hasReadyPod(uiPods);
}
