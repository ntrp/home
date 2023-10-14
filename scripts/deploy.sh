#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

aws s3 sync $DIR/../dist s3://$1 --delete

aws cloudfront create-invalidation --distribution-id $2 --paths "/*"
