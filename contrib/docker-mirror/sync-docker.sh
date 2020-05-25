echo \
'gcr.io/google_containers/pause-amd64:3.1
gcr.io/google-containers/k8s-dns-node-cache:1.15.5
k8s.gcr.io/cluster-proportional-autoscaler-amd64:1.6.0
gcr.io/kubernetes-helm/tiller:v2.14.3
gcr.io/google_containers/kube-registry-proxy:0.4
gcr.io/google_containers/metrics-server-amd64:v0.3.3
k8s.gcr.io/addon-resizer:1.8.3
gcr.io/google_containers/kubernetes-dashboard-amd64:v1.10.1' \
| while read repo; do
  echo $repo;
done
