#! /bin/bash

set -euxo pipefail

npm install

node scripts/scrape_wowhead.js > netlify/wowhead_data.json

ng build \
  --configuration production \
  dragonflight-talents
