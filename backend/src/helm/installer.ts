import { execFile } from "child_process";
import path from "path";

export function installWooCommerce(
  storeId: string,
  namespace: string,
  storeHost?: string,
  valuesFile?: string,
  scheme?: string,
  existingSecretName?: string
): Promise<void> {
  const release = `store-${storeId}`;
  const chartPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "charts",
    "woocommerce"
  );

  const args = ["install", release, chartPath, "-n", namespace];

  if (valuesFile) {
    args.push("-f", valuesFile);
  }
  if (storeHost) {
    args.push("--set", `wordpress.ingress.hostname=${storeHost}`);
  }
  if (scheme) {
    args.push("--set", `wordpress.wordpressScheme=${scheme}`);
  }
  if (existingSecretName) {
    args.push("--set", `wordpress.existingSecret=${existingSecretName}`);
  }

  return new Promise((resolve, reject) => {
    execFile("helm", args, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        return reject(error);
      }
      console.log(stdout);
      resolve();
    });
  });
}
