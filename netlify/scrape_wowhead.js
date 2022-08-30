const fetch = require('node-fetch');

const WH = {
  pageData : {},
  setPageData(k, v) { WH.pageData[k] = v; },
  getPageData(key) {
    if (WH.pageData[key] != null) {
      return WH.pageData[key];
    }

    throw new Error(`Missing pageData for ${key}`);
  },

  Wow : {
    Item : {},
  },
  Types : {},
  Game : {
    getEnv() { return 3; },
  },
  getDataEnv() { return WH.dataEnv.BETA; },
  getRootEnv() { return WH.dataEnv.BETA; },

  dataEnv : {
    MAIN : 1,
    PTR : 2,
    BETA : 3,
    CLASSIC : 4,
    TBC : 5,
    D2 : 6,
    DI : 7,
    WRATH : 8,
  },
  cO(into, obj) { return obj; },
};

exports.getData = async function() {
  const body = await fetchText("https://www.wowhead.com/beta/talent-calc");

  const trees = (await loadData(extractUrl(
      'talents-dragonflight', body)))['wow.talentCalcDragonflight.trees'];

  await loadData(extractUrl('data/global', body));

  await loadGlobalData(extractUrl('global.js', body));

  const colors = await loadColors(extractUrl('global.css', body))

  const classes = (() => {
    const cl = WH.Wow.PlayerClass;
    return cl.getAll().map(c => ({
                             id : c,
                             icon : cl.getIconName(c),
                             name : cl.getName(c),
                             slug : cl.getSlug(c),
                             color : colors[c],
                           }));
  })();

  const specs = (() => {
    const spec = WH.Wow.PlayerClass.Specialization;
    return spec.getAll().map(s => ({
                               id : s,
                               icon : spec.getIconName(s),
                               name : spec.getName(s),
                               slug : spec.getSlug(spec.getClassId(s), s),
                               classId : spec.getClassId(s),
                             }));
  })();

  return {
    classes,
    specs,
    trees,
  };
}

async function fetchText(url) {
  return await (await fetch(url.toString())).text();
}

function extractUrl(like, body) {
  const regex = new RegExp(`\"([^\"]*${like}.*)\"`);
  return new URL(body.match(regex)[1]);
}

async function loadData(url) {
  eval(await fetchText(url));

  return WH.pageData;
}

async function loadTooltipData(url) { const script = await fetchText(url); }

async function loadGlobalData(url) {
  const script = await fetchText(url);

  const defs = [
    'WH.Wow.PlayerClass',
    'WH.Wow.PlayerClass.Specialization',
  ];

  for (const def of defs) {
    eval(extractDef(def, script));
  }
}

function extractDef(def, script) {
  const start = script.indexOf(`${def}=`);
  const endOfScript = script.length;

  let startBrace;
  for (let i = start; i < endOfScript; i++) {
    if (script[i] === '{') {
      startBrace = i;
      break;
    }
  }
  if (startBrace == null)
    throw new Error(`Failed to extract ${def}`);

  let braceDepth = 0;
  let endBrace;
  for (let i = startBrace + 1; i < endOfScript; i++) {
    const char = script[i];
    const isEnd = char === '}';
    if (isEnd && braceDepth === 0) {
      endBrace = i;
      break;
    }

    braceDepth += char === '{' ? 1 : char === '}' ? -1 : 0;
  }
  if (endBrace == null)
    throw new Error(`Failed to extract ${def}`);

  return script.slice(start, endBrace + 1);
}

async function loadColors(url) {
  const css = await fetchText(url);

  const regex = /\.cta-button\.c(\d+)\{color:(#[\w]+) !important}/g;

  const result = {};
  for (const match of css.matchAll(regex)) {
    result[+match[1]] = match[2];
  }

  return result;
}
