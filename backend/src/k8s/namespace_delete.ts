import { getCoreV1Api } from "./client";

export async function deleteNamespace(namespace: string){
    const coreApi = await getCoreV1Api();
    try {
        await coreApi.deleteNamespace({ name: namespace });
    } catch (err: any) {
        const statusCode =
            err?.response?.statusCode ??
            err?.statusCode ??
            err?.body?.code;
        if (statusCode === 404) {
            return;
        }
        throw err;
    }
}
