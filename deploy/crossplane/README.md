# AGenNext control plane (Crossplane v2)

AGenNext is operated as a **composable control plane**. Instead of applying raw
Deployments, operators install one declarative API — `AgennextPlatform` — and
Crossplane composes and continuously reconciles the underlying resources.

Targets **Crossplane v2.3**: Composite Resources are **namespaced** and Claims
are removed — you apply the `AgennextPlatform` XR directly (no `X`-prefixed
composite + claim split).

```
AgennextPlatform (namespaced XR)
   └─ Composition: agennext-platform   (mode: Pipeline)
        └─ function-patch-and-transform
             ├─ Object → Deployment/agennext   (patched: replicas, image, trustDomain)
             └─ Object → Service/agennext
```

## Install

```bash
# 1. Crossplane v2 + the patch-and-transform function + provider-kubernetes
helm install crossplane crossplane-stable/crossplane -n crossplane-system \
  --create-namespace --version 2.3.x
kubectl apply -f https://raw.githubusercontent.com/crossplane-contrib/function-patch-and-transform/main/package/crossplane.yaml
kubectl apply -f https://raw.githubusercontent.com/crossplane-contrib/provider-kubernetes/main/examples/provider/config-in-cluster.yaml

# 2. Teach the control plane the platform API (XRD scope: Namespaced)
kubectl apply -f deploy/crossplane/definition.yaml
kubectl apply -f deploy/crossplane/composition.yaml

# 3. Apply a platform (a namespaced composite resource)
kubectl apply -f deploy/crossplane/platform.yaml
kubectl -n default get agennextplatform agennext -o yaml   # watch it reconcile
```

The live desired/observed view is mirrored in the app at `/control` and
`GET /api/control`.

## Files
- `definition.yaml` — CompositeResourceDefinition (`apiextensions.crossplane.io/v2`, `scope: Namespaced`)
- `composition.yaml` — Composition (pipeline mode, function-patch-and-transform)
- `platform.yaml` — example `AgennextPlatform` composite resource
