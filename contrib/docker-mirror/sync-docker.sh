#!/bin/bash

# Copyright (c) Microsoft Corporation
# All rights reserved.
#
# MIT License
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
# documentation files (the "Software"), to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
# to permit persons to whom the Software is furnished to do so, subject to the following conditions:
# The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
set -e

if [ $# -ne 1 ]; then
  echo "Usage: bash -x sync-docker.sh <mirror-image-account>"
  exit 1
else
  account=$1
fi

if hash sudo ; then
  DOCKER='sudo docker'
else
  DOCKER='docker'
fi

echo \
'gcr.io/google_containers/pause-amd64:3.1
gcr.io/google-containers/k8s-dns-node-cache:1.15.5
k8s.gcr.io/cluster-proportional-autoscaler-amd64:1.6.0
gcr.io/kubernetes-helm/tiller:v2.14.3
gcr.io/google_containers/kube-registry-proxy:0.4
gcr.io/google_containers/metrics-server-amd64:v0.3.3
k8s.gcr.io/addon-resizer:1.8.3
gcr.io/google_containers/kubernetes-dashboard-amd64:v1.10.1' \
| while read image; do
  image_name=`echo $image | cut -d "/" -f2- | cut -d ":" -f1`
  image_name=${name//\//-}
  tag=`echo $image | cut -d ":" -f2`
  new_image="${account}/${image_name}:${tag}"
  $DOCKER pull $image
  $DOCKER tag $image $new_image
  $DOCKER push ${new_image}
done
