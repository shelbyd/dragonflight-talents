const {getData} = require('../scrape_wowhead.js');

let fromFile;
try {
  fromFile = require('../wowhead_data.json');
  console.log('Pre-loaded cache from file');
} catch (e) {
  console.error(e);
}

const cacheFor = 1000 * 60 * 10;

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
    if (!this.cached && fromFile != null) {
      return [ fromFile, new Date() ];
    }

    try {
      console.log('Scraping WowHead');
      return [ await getData(), new Date(new Date().valueOf() + cacheFor) ];
    } catch (e) {
      console.error(e);
      if (fromFile != null)
        return [ fromFile, new Date() ];
      throw new Error('Failed to load data and did not have backup file');
    }
  }
}

const cached = new Cached();

exports.handler = async (event) => {
  const data = await cached.get();

  return {
    statusCode : 200,
    body : JSON.stringify(data),
    headers : {
      'Access-Control-Allow-Origin' : '*',
    },
  };
};
