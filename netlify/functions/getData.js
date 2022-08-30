const {getData} = require('../scrape_wowhead.js');
const {readFile} = require('fs');

class Cached {
  // null | Promise<Data> | Data;
  cached = null;

  // null | Date
  expiresAt = null;

  isRefreshing = false;

  constructor() { this.refresh(); }

  async get() {
    const cacheValid = this.expiresAt != null && this.expiresAt > new Date();
    if (cacheValid)
      return this.cached;

    if (this.cached) {
      console.log('Cache expired, refreshing, but returning cached');
      this.refresh();

      return await this.cached;
    }

    console.log('No cached value, awaiting refresh');
    return await this.refresh();
  }

  async refresh() {
    if (this.isRefreshing)
      return await this.cached;

    console.log('Beginning cache refresh');
    this.isRefreshing = true;

    const loading = this.loadData();
    if (!this.cached) {
      this.cached = loading.then(pair => pair[0]);
    }
    const loaded = await loading;
    this.cached = loaded[0];
    this.expiresAt = loaded[1];

    console.log(`Cache refresh finished, expires at ${this.expiresAt}`);

    this.isRefreshing = false;
    return this.cached;
  }

  async loadData() {
    if (!this.cached) {
      try {
        const file = await new Promise(
            (resolve, reject) =>
                readFile('netlify/wowhead_data.json',
                         (err, file) => err ? reject(err) : resolve(file)));
        console.log('Loaded cache from file');
        return [ JSON.parse(file), new Date() ];
      } catch (e) {
        console.error(e);
      }
    }

    console.log('Scraping WowHead');
    return [ await getData(), new Date(new Date().valueOf() + 1000 * 60 * 60) ];
  }
}

const cached = new Cached();

exports.handler = async (event) => {
  const data = await cached.get();

  return {
    statusCode : 200,
    body : JSON.stringify(data),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
};