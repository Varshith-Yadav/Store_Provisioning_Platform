# Uruimi Store Provisioning Platform

This repo provisions per-store WooCommerce stacks on Kubernetes using Helm, with a React dashboard and a Node API.

## Local setup (Kind/k3d/Minikube)
1. Install prerequisites:
   - `kubectl`, `helm`, `nodejs`
   - A local Kubernetes cluster (Kind, k3d, or Minikube)
   - An ingress controller (nginx ingress recommended)
2. Ensure Helm dependencies are available:
   - `helm dependency update charts/woocommerce`
3. Start the API:
   - `cd backend/store-plartform`
   - `npm install`
   - `$env:STORE_DOMAIN = "localhost"`
   - `$env:STORE_PROTOCOL = "http"`
   - `$env:STORE_VALUES_FILE = "..\\..\\charts\\woocommerce\\values-local.yaml"`
   - `$env:MEDUSA_VALUES_FILE = "..\\..\\charts\\medusa\\values-local.yaml"`
   - `npm run dev`
4. Start the dashboard:
   - `cd ../../dashboard`
   - `npm install`
   - `npm run dev`

## Domain strategy (local)
Each store is exposed via ingress using `store-<id>.<domain>`. The default domain is `localhost`, which resolves to `127.0.0.1` on most systems. If your ingress controller uses a different IP, set `STORE_DOMAIN` to a wildcard DNS like `127.0.0.1.nip.io` (or the node IP with `.nip.io`).

## Provision a store
You can use the dashboard or API:
1. Open the dashboard and click `Create store`.
2. The API creates a namespace, resource quota, limit range, a WordPress secret, then installs the WooCommerce Helm chart.
3. The provisioning worker updates the status to `ready` once the WordPress pod is running and ready.

## WooCommerce end-to-end checkout demo
1. Get admin credentials:
   - Username: `admin`
   - Password:
     - `kubectl -n <store-namespace> get secret wordpress-credentials -o jsonpath="{.data.wordpress-password}" | base64 -d`
2. Visit the store admin URL:
   - `http://store-<id>.<domain>/wp-admin`
3. Complete the WooCommerce setup wizard.
4. Create a product.
5. Enable the `Cash on Delivery` payment method in WooCommerce settings.
6. Open the storefront, add the product to the cart, and complete checkout.
7. Verify the order appears in WooCommerce admin under `Orders`.

## Medusa end-to-end checkout demo
1. Open the storefront:
   - `http://store-<id>.<domain>`
2. If no products are listed, open Medusa admin:
   - `http://store-<id>.<domain>/app`
   - Default admin credentials for the bundled Medusa testing image:
     - Email: `admin@medusa-test.com`
     - Password: `hsalem.com`
3. Create a product in the admin UI.
4. Return to the storefront, add the product to cart, and click `Checkout (test)`.
5. Confirm the order exists in Medusa admin or via API.

Note: The storefront uses the publishable API key defined in `charts/medusa/values.yaml`. If you change it, update the values file accordingly.

## Delete a store
Use the dashboard `Delete` action or the API:
- `DELETE /stores/<id>`
The system uninstalls the Helm release and deletes the namespace.

## Production-like setup (k3s)
1. Use the same charts with production values:
   - `$env:STORE_DOMAIN = "your-domain.com"`
   - `$env:STORE_PROTOCOL = "https"`
   - `$env:STORE_VALUES_FILE = "..\\..\\charts\\woocommerce\\values-prod.yaml"`
   - `$env:MEDUSA_VALUES_FILE = "..\\..\\charts\\medusa\\values-prod.yaml"`
2. Configure DNS to point `*.your-domain.com` to your ingress controller.
3. Optionally configure TLS (cert-manager) by adding annotations and TLS values in `values-prod.yaml`.

## Values files
- `charts/woocommerce/values.yaml` contains shared defaults and no hardcoded passwords.
- `charts/woocommerce/values-local.yaml` provides local ingress settings.
- `charts/woocommerce/values-prod.yaml` provides production storage class and sizing.

## Notes
- Medusa provisioning is implemented via the `charts/medusa` Helm chart and a minimal storefront.
- The default Medusa image is a testing image; override `charts/medusa/values*.yaml` for production-grade images.
