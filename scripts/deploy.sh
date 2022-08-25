#! /bin/bash

set -euxo pipefail

npm install

node scripts/scrape_wowhead.js

ng deploy
