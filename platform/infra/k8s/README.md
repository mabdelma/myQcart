# Escoutly on Kubernetes

Manifests for the microservices platform. See `../../ARCHITECTURE.md` for the design.

> The current production runs on a **single VPS with Docker Compose + Caddy** — there is
> **no k8s cluster yet**. These manifests are the target; provisioning the cluster is
> "Phase 0". Until then, the monolith keeps serving production unchanged.

## Prerequisites (Phase 0)
- A Kubernetes cluster (managed: DO/Hetzner/GKE/EKS, or k3s on the VPS).
- `ingress-nginx` + `cert-manager` (with a `letsencrypt-prod` ClusterIssuer).
- An image registry (`registry.escoutly.com` in the manifests — change to yours).
- DNS: `api.escoutly.com` → the ingress load balancer.

## Build & push images (monorepo, build context = repo root)
```bash
for s in auth listings billing engagement notifications; do
  docker build -f services/$s/Dockerfile -t registry.escoutly.com/$s:latest .
  docker push registry.escoutly.com/$s:latest
done
```
> The service Dockerfiles expect **npm workspaces** at the repo root to link
> `@escoutly/shared`. Add a root `package.json` with
> `"workspaces": ["packages/*", "services/*", "apps/*"]` before building (kept out of
> this scaffold so it can't affect the live apps' builds).

## Deploy
```bash
cp infra/k8s/secrets.example.yaml infra/k8s/secrets.yaml   # fill real values
# edit kustomization.yaml to use secrets.yaml
kubectl apply -k infra/k8s/
kubectl -n escoutly get pods
```

## Strangler cutover (per service)
1. Deploy the service; confirm `/health` + `/ready`.
2. Port the domain logic from the monolith into the service (TODOs in each `server.ts`).
3. Point the gateway/clients at `api.escoutly.com/v1/<svc>` instead of the monolith route.
4. Run both in parallel; compare; then delete the monolith's copy of that slice.

Recommended order: **notifications → billing → listings → engagement → auth → web**.

## Local dev (without a cluster)
```bash
# add the root workspaces config first, then:
npm install
npm --workspace @escoutly/notifications run dev   # :8080  (repeat per service with different PORT)
```
