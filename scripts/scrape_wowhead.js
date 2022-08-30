const {getData} = require('../netlify/scrape_wowhead');

async function main() {
  const json = JSON.stringify(await getData());

  const fs = require('fs');
  fs.writeFileSync('src/assets/data.json', json);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
