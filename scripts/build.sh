#! /bin/bash

set -euxo pipefail

npm install

node scripts/scrape_wowhead.js
cp src/assets/data.json netlify/wowhead_data.json

ng build
