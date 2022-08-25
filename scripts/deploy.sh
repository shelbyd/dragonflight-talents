#! /bin/bash

set -euxo pipefail

node scripts/scrape_wowhead.js

ng deploy
