import { getCoreV1Api } from "./client";

export async function applyResourceQuota(namespace: string) {
  try {
    const coreApi = await getCoreV1Api();
    await coreApi.createNamespacedResourceQuota({
      namespace,
      body: {
        metadata: {
          name: "store-quota"
        },
        spec: {
          hard: {
            "requests.cpu": "1",
            "requests.memory": "1Gi",
            "limits.cpu": "2",
            "limits.memory": "2Gi",
            "persistentvolumeclaims": "2",
            "pods": "10"
          }
        }
      }
    });

    console.log(`ResourceQuota applied to ${namespace}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      console.log(`ResourceQuota already exists in ${namespace}`);
      return;
    }
    throw err;
  }
}
