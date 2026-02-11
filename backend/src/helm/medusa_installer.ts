import { execFile } from "child_process";
import path from "path";

export function installMedusa(
  storeId: string,
  namespace: string,
  host: string,
  valuesFile?: string,
  protocol?: string
): Promise<void> {
  const release = `store-${storeId}`;
  const chartPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "charts",
    "medusa"
  );

  const args = ["install", release, chartPath, "-n", namespace];
  if (valuesFile) {
    args.push("-f", valuesFile);
  }
  if (host) {
    args.push("--set", `host=${host}`);
  }
  if (protocol) {
    args.push("--set", `protocol=${protocol}`);
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
