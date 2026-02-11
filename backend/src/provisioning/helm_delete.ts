import { execFile } from "child_process";

export function uninstallWooCommerce(
    storeId: string,
    namespace: string
): Promise<void> {
    const release = `store-${storeId}`;

    return new Promise((resolve, reject) => {
        execFile("helm", ["uninstall", release, "-n", namespace], (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                return reject(error);
            }
            console.log(stdout);
            resolve();
        });
    });
}

export function uninstallMedusa(
    storeId: string,
    namespace: string
): Promise<void> {
    const release = `store-${storeId}`;

    return new Promise((resolve, reject) => {
        execFile("helm", ["uninstall", release, "-n", namespace], (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                return reject(error);
            }
            console.log(stdout);
            resolve();
        });
    });
}
