import { getCoreV1Api } from "./client";

export async function applyLimitRange(namespace: string) {
  try {
    const coreApi = await getCoreV1Api();
    await coreApi.createNamespacedLimitRange({
      namespace,
      body: {
        metadata: {
          name: "store-limits"
        },
        spec: {
          limits: [
            {
              type: "Container",
              _default: {
                cpu: "500m",
                memory: "512Mi"
              },
              defaultRequest: {
                cpu: "250m",
                memory: "256Mi"
              }
            }
          ]
        }
      }
    });

    console.log(`LimitRange applied to ${namespace}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      console.log(`LimitRange already exists in ${namespace}`);
      return;
    }
    throw err;
  }
}
