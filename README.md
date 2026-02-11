# Uruimi Store Provisioning Platform

A local-first store provisioning platform that spins up WooCommerce or Medusa stacks per store using Kubernetes namespaces + Helm, with a Node API and a React dashboard.

**Repo layout**
- `backend/store-plartform`: Node API + provisioning worker
- `user_dashboard`: React dashboard
- `charts/woocommerce`: WooCommerce Helm chart (Bitnami WordPress dependency)
- `charts/medusa`: Medusa Helm chart (API + minimal storefront)

**Local setup (Minikube)**
1. Prereqs: `kubectl`, `helm`, `nodejs`, `minikube`.
2. Start Minikube:
```powershell
minikube start
minikube addons enable ingress
```
3. Ensure ingress is reachable on localhost (recommended):
```powershell
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"LoadBalancer"}}'
minikube tunnel
```
Keep the tunnel terminal open.
4. Update Helm dependencies:
```powershell
helm dependency update charts/woocommerce
```
5. Start the API:
```powershell
cd backend/store-plartform
npm install
$env:STORE_DOMAIN = "localhost"
$env:STORE_PROTOCOL = "http"
$env:STORE_VALUES_FILE = "..\\..\\charts\\woocommerce\\values-local.yaml"
$env:MEDUSA_VALUES_FILE = "..\\..\\charts\\medusa\\values-local.yaml"
npm run dev
```
6. Start the dashboard:
```powershell
cd ../../user_dashboard
npm install
npm run dev
```

**Local domain strategy**
Each store is exposed via ingress using `store-<id>.localhost`. With `minikube tunnel` and the ingress controller service set to `LoadBalancer`, this resolves to `127.0.0.1` without hosts file edits. If you prefer NodePort, set `VITE_STORE_PORT` in `user_dashboard/.env.local` and use the Minikube IP + NodePort.

**Create a store**
1. Open the dashboard and click `Create store`.
2. The API creates a namespace, applies quota/limits, creates secrets, and installs the Helm chart.
3. The provisioning worker marks the store `ready` when pods are healthy.

**WooCommerce end-to-end checkout**
1. Get admin credentials:
```powershell
kubectl -n <store-namespace> get secret wordpress-credentials -o jsonpath="{.data.wordpress-password}" | base64 -d
```
2. Open admin: `http://store-<id>.localhost/wp-admin`.
3. Complete the WooCommerce setup wizard.
4. Create a product and enable `Cash on Delivery`.
5. Add to cart, checkout, and verify the order appears in WooCommerce admin.

**Medusa end-to-end checkout**
1. Open storefront: `http://store-<id>.localhost`.
2. Admin: `http://store-<id>.localhost/app`.
3. Default admin for the test image: `admin@medusa-test.com` / `hsalem.com`.
4. Create a product, add to cart, complete checkout, verify the order in admin.

**Delete a store**
Use the dashboard `Delete` action or call `DELETE /stores/<id>`. The system uninstalls the Helm release and deletes the namespace. Deletion is idempotent if resources are already gone.

**Production-like setup (k3s)**
1. Install k3s and an ingress controller (nginx).
2. Set production values:
```powershell
$env:STORE_DOMAIN = "your-domain.com"
$env:STORE_PROTOCOL = "https"
$env:STORE_VALUES_FILE = "..\\..\\charts\\woocommerce\\values-prod.yaml"
$env:MEDUSA_VALUES_FILE = "..\\..\\charts\\medusa\\values-prod.yaml"
```
3. Configure DNS so `*.your-domain.com` points to the ingress load balancer.
4. Add TLS and cert-manager annotations in `values-prod.yaml` if needed.

**Helm charts + values**
- `charts/woocommerce/values.yaml`: defaults with generated secrets (no hardcoded passwords).
- `charts/woocommerce/values-local.yaml`: local ingress hostname + LoadBalancer service.
- `charts/woocommerce/values-prod.yaml`: production storage class/size.
- `charts/medusa/values.yaml`: defaults for Medusa API + storefront.
- `charts/medusa/values-local.yaml`: local ingress hostname.
- `charts/medusa/values-prod.yaml`: production storage class/size.

**System design & tradeoffs**
1. Architecture: a Node API creates a store record, provisions a namespace, applies ResourceQuota/LimitRange, and installs a Helm release. A worker polls readiness and updates status.
2. Idempotency: namespace/quota/limit creation ignores 409s; deletion ignores missing namespace/release and marks the row deleted.
3. Failure handling: provisioning failures record `error_reason`; delete failures record `delete_failed` and do not block cleanup retries.
4. Production changes: DNS wildcard and TLS, ingress controller service type, storage class sizing, and secret management via Kubernetes secrets.
5. Security posture: WordPress admin password is generated per store; no hardcoded secrets in values files.

