const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();
const UglifyJS = require('uglify-js');
const { transform } = require('@babel/core');
const { env, defaultLangs, priorityLangs } = require('c0nfig');
const { languagesAll } = require('countries-list');

const OTHER_LANGS = { ...languagesAll };
const TOP_LANGS = Object.keys(languagesAll)
  .filter(lang => {
    return priorityLangs.includes(lang);
  })
  .reduce((memo, lang) => {
    memo[lang] = languagesAll[lang];

    delete OTHER_LANGS[lang];

    return memo;
  }, {});

function createApp (data) {
  return new Vue({
    data() {
      return {
        // server data
        text: data.text,
        toLang: data.toLang,
        fromLang: data.fromLang,
        topLangs: data.topLangs,
        otherLangs: data.otherLangs,
        allLangs: data.allLangs,

        // client data
        t: {},
        error: null,
        tHistory: [],
      };
    },

    beforeMount() {
      this.checkHistory();

      if (!this.text) {
        return;
      }

      this.getTranslation();
      this.saveToHistory();
    },

    computed: {
      query() {
        return `?text=${this.text}&from=${this.fromLang}&to=${this.toLang}`
      }
    },

    methods: {
      handleTranslate() {
        if (!this.text) {
          return;
        }

        this.updateLink();
        this.getTranslation();
        this.saveToHistory();
      },

      handleSwap() {
        const toLang = this.toLang;
        const fromLang = this.fromLang;

        this.toLang = fromLang;
        this.fromLang = toLang;

        this.updateLink();
        this.getTranslation();
        this.saveToHistory();
      },

      getTranslation() {
        fetch(`/translate${this.query}`)
          .then(res => res.json())
          .then(json => this.t = json)
          .catch(() => this.error = 'Something went wrong while translating...');
      },

      updateLink() {
        if (history.pushState) {
          const url =`${location.pathname}${this.query}`;

          history.pushState({ url }, '', url);
        } else {
          location.search = this.query;
        }
      },

      goToTranslation(item) {
        if (!item.text) {
          return;
        }

        this.text = item.text;
        this.toLang = item.toLang;
        this.fromLang = item.fromLang;

        this.updateLink();
        this.getTranslation();
        this.saveToHistory();
      },

      checkHistory() {
        if (!localStorage) {
          return;
        }

        try {
          this.tHistory = JSON.parse(localStorage.getItem('tHistory')) || [];
        } catch (e) {
          // noop
        }
      },

      saveToHistory() {
        if (!localStorage) {
          return;
        }

        const newItem = {
          text: this.text,
          toLang: this.toLang,
          fromLang: this.fromLang
        };

        const existingIndex = this.tHistory.findIndex(item => {
          return (
            item.text === newItem.text &&
            item.toLang === newItem.toLang &&
            item.fromLang === newItem.fromLang
          );
        });

        if (existingIndex > -1) {
          this.tHistory.splice(existingIndex, 1);
        }

        this.tHistory.unshift(newItem);

        localStorage.setItem('tHistory', JSON.stringify(this.tHistory));
      },

      cleanHistory() {
        this.tHistory = [];

        localStorage.removeItem('tHistory');
      }
    },

    template: `
      <div class="container p3" style="max-width: 500px;">
        <div>
          <label class="label">From:</label>
          <select v-model="fromLang" class="block col-12 field" placeholder="Language from">
            <optgroup>
              <option
                v-for="(langVal, langName) in topLangs"
                :value="langName"
                :selected="langName === fromLang">
                {{langVal.name}}
              </option>
            </optgroup>
            <optgroup>
              <option
                v-for="(langVal, langName) in otherLangs"
                :value="langName"
                :selected="langName === fromLang">
                {{langVal.name}}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="mt1">
          <label class="label">To:</label>
          <select v-model="toLang" class="block col-12 field" placeholder="Language to">
            <optgroup>
              <option
                v-for="(langVal, langName) in topLangs"
                :value="langName"
                :selected="langName === toLang">
                {{langVal.name}}
              </option>
            </optgroup>
            <optgroup>
              <option
                v-for="(langVal, langName) in otherLangs"
                :value="langName"
                :selected="langName === toLang">
                {{langVal.name}}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="mt1">
          <label class="label">Text:</label>
          <textarea
            v-model="text"
            class="block col-12 field"
            placeholder="What do you want to translate?"
            style="height: 150px; resize: vertical;">
          </textarea>
        </div>

        <div class="mt2 mb3">
          <button type="button" class="btn btn-primary" @click="handleTranslate">
            Translate
          </button>
          <button type="button" class="btn btn-outline blue ml1" @click="handleSwap">
            Swap
          </button>
        </div>

        <div v-if="error">
          {{error}}
        </div>

        <div v-if="t.googletranslate">
          <h3>Google Translate</h3>
          <p>👉 {{t.googletranslate.text}}</p>
        </div>

        <div v-if="t.urbandictionary && t.urbandictionary.list && t.urbandictionary.list.length">
          <h3>Urban Dictionary</h3>
          <p v-for="item in t.urbandictionary.list">
            <span class="block">👉 {{item.definition}}</span>
            <span class="block h5 mt1 italic">{{item.example}}</span>
          </p>
        </div>

        <div class="mt2 mb3" v-if="tHistory.length">
          <hr class="mb2" />
          <div v-for="item in tHistory" class="mb1">
            <a href="#" @click.stop.prevent="goToTranslation(item)">
              {{item.text}} (from {{allLangs[item.fromLang].name}} to {{allLangs[item.toLang].name}})
            </a>
          </div>
          <div class="mt2">
            <button type="button" class="btn btn-outline h5" @click="cleanHistory">
              Clean history
            </button>
          </div>
        </div>
      </div>
    `
  });
}

function clientEntry (g, state, _createApp) {
  const app = _createApp(state);

  app.$mount('#app');
}

function js (state) {
  const code = `
    (${clientEntry.toString()})(
      window,
      ${JSON.stringify(state)},
      ${createApp.toString()}
    );
  `;

  const babelOptions = {
    presets: [
      ['@babel/preset-env', {
        'targets': {
          'browsers': ['last 2 versions']
        }
      }]
    ]
  };

  const transformed = transform(code, babelOptions);

  if (env === 'development') {
    return transformed.code;
  }

  const minified = UglifyJS.minify(transformed.code);

  return minified.code;
}

function html (appString, state) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="robots" content="nofollow,noindex">
        <title>Multi Translator UI</title>

        <link href="https://unpkg.com/normalize.css@8.0.0/normalize.css" rel="stylesheet">
        <link href="https://unpkg.com/basscss@7.1.1/css/basscss.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="clearfix white bg-black">
          <div class="center absolute top-0 left-0 right-0 bottom-0 clearfix">
            <a href="/" class="btn py2 h3 m0">
              <sup class="regular h5">multi</sup>
              <span>translator</span>
            </a>
          </div>
          <div class="right">
            <a href="https://github.com/voronianski/multi-translator" class="btn py2 m0 regular h6 caps" target="_blank">
              GitHub
            </a>
          </div>
        </div>
        <div id="app">${appString}</div>
      </body>
      <script src="https://unpkg.com/vue@${Vue.version}/dist/vue.js"></script>
      <script>${js(state)}</script>
    </html>
  `;
}

module.exports = function ui (req, res, next) {
  const state = {
    text: req.query.text || '',
    toLang: req.query.to || defaultLangs.to,
    fromLang: req.query.from || defaultLangs.from,
    otherLangs: OTHER_LANGS,
    topLangs: TOP_LANGS,
    allLangs: languagesAll
  };
  const app = createApp(state);

  renderer.renderToString(app)
    .then(str => res.send(html(str, state)))
    .catch(next)
};
