import { getCoreV1Api }  from "./client";


export async function createNamespace(namespace: string, labels: Record<string, string>){
    try {
        const coreV1Api = await getCoreV1Api();
        await coreV1Api.createNamespace(
            {
                body: {
                    metadata: {
                        name: namespace,
                        labels
                    }
                }
            }
        );

        console.log(`Namespace ${namespace} created successfully`);
    }
    catch (err: any){
        if (err.response?.statusCode === 409){
            console.log(`Namespace ${namespace} already exits`);
            return ;
        }
        throw err;
    }
}

