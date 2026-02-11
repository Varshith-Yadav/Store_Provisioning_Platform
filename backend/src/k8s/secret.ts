import { getCoreV1Api } from "./client";

export async function upsertOpaqueSecret(
  namespace: string,
  name: string,
  data: Record<string, string>
): Promise<void> {
  const coreApi = await getCoreV1Api();
  try {
    await coreApi.createNamespacedSecret({
      namespace,
      body: {
        metadata: {
          name
        },
        type: "Opaque",
        stringData: data
      }
    });
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      await coreApi.replaceNamespacedSecret({
        name,
        namespace,
        body: {
          metadata: {
            name
          },
          type: "Opaque",
          stringData: data
        }
      });
      return;
    }
    throw err;
  }
}
