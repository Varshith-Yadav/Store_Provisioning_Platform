# 🛍️ Multi-Tenant WooCommerce Store Provisioning Platform

This platform automates the provisioning of fully isolated WooCommerce stores on Kubernetes using Helm. It's portable and works both for local development (Minikube) and production-style VPS setups (k3s).

Each store runs in its own dedicated Kubernetes namespace for total isolation.

Author: Varshith Yadav

## 📦 Architecture Overview

- **API Service:** Node.js-based controller that handles lifecycle (creation/deletion) of stores.
- **Helm Charts:** Templated deployments for WordPress (WooCommerce) and MariaDB.
- **Kubernetes:** Orchestration layer providing resource isolation per namespace.
- **Ingress (NGINX):** Dynamic routing to map unique store URLs to namespaces.
- **Persistent Volumes (PVC):** Database and media persistence.
- **Isolation Strategy:** One store = one namespace to prevent cross-store impact.

## 🚀 1. Local Setup (Minikube)

### Prerequisites

- `Docker`
- `kubectl`
- `helm`
- `minikube`

### Step-by-step Installation

1. Start Minikube & enable ingress:

```bash
minikube start
minikube addons enable ingress
```

2. Verify Ingress Controller:

```bash
kubectl get pods -n ingress-nginx
```

3. Make Ingress Accessible — patch the controller to LoadBalancer and start the tunnel:

```bash
kubectl patch svc ingress-nginx-controller \
  -n ingress-nginx \
  --type=merge \
  -p '{"spec":{"type":"LoadBalancer"}}'

minikube tunnel
```

Keep the `minikube tunnel` running in a terminal so LoadBalancer IPs resolve locally.

4. Launch the API service (from `backend`):

```bash
cd backend
npm install
npm run dev
```

## 🛒 2. Store Operations & Workflow

### Create a Store

Send a request to the API to trigger the Helm deployment:

```bash
curl -X POST http://localhost:3000/create-store
```

What happens behind the scenes:

- A new namespace is created (e.g., `store-xxxx`).
- Helm installs WordPress + MariaDB into that namespace.
- PVCs and Kubernetes Secrets are created for persistence and credentials.
- An Ingress rule is generated (e.g., `store-xxxx.<minikube-ip>.nip.io`).

### Place a Test Order

- Access: Open the generated URL in your browser.
- Configure: Login to `/wp-admin`, add a product, publish it.
- Checkout: Add the product to cart and use Cash on Delivery (COD).
- Verify: In WooCommerce → Orders you should see the transaction.

### How to see the WordPress admin password

After creating a store the provisioning creates Kubernetes Secrets in the store namespace. To view and decode the WordPress admin password:

- List secrets in the store namespace:

```bash
kubectl get secret -n <store-namespace>
```

- View the `wordpress-credentials` secret (YAML) and inspect the `.data` field:

```bash
kubectl get secret wordpress-credentials \
  -n store-ef9d6d8e-e882-4e85-a3ac-b59d7aecaf49 \
  -o yaml
```

- Decode the password (JSONPath) and print it — example PowerShell sequence:

```powershell
$pw = kubectl get secret wordpress-credentials `
  -n store-ef9d6d8e-e882-4e85-a3ac-b59d7aecaf49 `
  -o jsonpath="{.data.wordpress-password}"

[System.Text.Encoding]::UTF8.GetString(
  [System.Convert]::FromBase64String($pw)
)
```

- Or decode on Linux/macOS using `base64`:

```bash
kubectl get secret wordpress-credentials -n <store-namespace> -o jsonpath="{.data.wordpress-password}" | base64 --decode
```

Replace `<store-namespace>` with the actual namespace name created for the store (for example: `store-ef9d6d8e-e882-4e85-a3ac-b59d7aecaf49`).

### Delete a Store

Use the API or kubectl:

```bash
curl -X DELETE http://localhost:3000/store/{id}
# Or manually
kubectl delete namespace store-xxxx
```

## 🌍 3. VPS / Production Setup (k3s)

For a production-like environment on a Linux VPS (GCP, AWS, DigitalOcean):

### Install k3s & Helm

```bash
curl -sfL https://get.k3s.io | sh -
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Deploy NGINX Ingress

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
```

### Domain Mapping

- Development: Use `store-xyz.<VPS-IP>.nip.io`.
- Production: Point a wildcard DNS A record (`*.yourdomain.com`) to the VPS IP.

## 🔐 Security & Scaling

- **Data Security:** Databases are not exposed publicly; credentials are stored in Kubernetes Secrets.
- **Persistence:** PVCs ensure data survives pod restarts and upgrades.
- **Horizontal Scaling:** The API service can be scaled as a Deployment; stores can use HPA.
- **Resource Control:** Namespace-level `ResourceQuota` and `LimitRange` prevent a single store consuming all cluster resources.

## ✅ Project Highlights

- **Infrastructure as Code:** Entire store environment defined via Helm.
- **Portability:** Same workflow for local dev and cloud production.
- **Automation:** Zero-touch provisioning of WordPress + MariaDB stacks per store.

---


