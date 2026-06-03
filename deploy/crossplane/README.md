# AGenNext control plane (Crossplane)

AGenNext is operated as a **composable control plane**. Instead of applying raw
Deployments, operators install one declarative API — `AgennextPlatform` — and
Crossplane composes and continuously reconciles the underlying resources.

```
AgennextPlatform (claim)
   └─ XAgennextPlatform (composite)
        └─ Composition: agennext-platform
             ├─ Object → Deployment/agennext   (patched: replicas, image, trustDomain)
             └─ Object → Service/agennext
```

## Install

```bash
# 1. Crossplane + the patch-and-transform function + provider-kubernetes
helm install crossplane crossplane-stable/crossplane -n crossplane-system --create-namespace
kubectl apply -f https://raw.githubusercontent.com/crossplane-contrib/function-patch-and-transform/main/package/crossplane.yaml
kubectl apply -f https://raw.githubusercontent.com/crossplane-contrib/provider-kubernetes/main/examples/provider/config-in-cluster.yaml

# 2. Teach the control plane the platform API
kubectl apply -f deploy/crossplane/definition.yaml
kubectl apply -f deploy/crossplane/composition.yaml

# 3. Declare a platform
kubectl apply -f deploy/crossplane/platform-claim.yaml
kubectl get agennextplatform agennext -o yaml   # watch it reconcile
```

The live desired/observed view is mirrored in the app at `/control` and
`GET /api/control`.

## Files
- `definition.yaml` — CompositeResourceDefinition (the `AgennextPlatform` API)
- `composition.yaml` — Composition (pipeline mode, function-patch-and-transform)
- `platform-claim.yaml` — example claim
