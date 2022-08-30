const {getData} = require('../netlify/scrape_wowhead');

async function main() {
  const json = JSON.stringify(await getData());

  console.log(JSON.stringify(await getData()));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
