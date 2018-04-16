const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();
const UglifyJS = require('uglify-js');
const { transform } = require('@babel/core');
const { env, priorityLangs } = require('c0nfig');
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

        // client data
        t: {},
        error: null
      };
    },

    beforeMount() {
      this.getTranslation();
    },

    methods: {
      handleClick() {
        this.getTranslation();
      },

      getTranslation() {
        if (!this.text) {
          return;
        }

        fetch(`/translate?text=${this.text}&from=${this.fromLang}&to=${this.toLang}`)
          .then(res => res.json())
          .then(json => this.t = json )
          .catch(() => this.error = 'Something went wrong while translating...');
      }
    },

    template: `
      <div class="app">
        <div>
          <label>From:</label>
          <select v-model="fromLang" placeholder="Language from">
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

          <label>To:</label>
          <select v-model="toLang" placeholder="Language to">
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

        <div>
          <label>Text:</label>
          <textarea v-model="text" placeholder="Word to translate"></textarea>
        </div>

        <div>
          <span>{{text}} / {{fromLang}} / {{toLang}}</span>
          <a href="#" @click="handleClick">Click</a>
        </div>

        <div v-if="t.googletranslate">
          {{t.googletranslate.text}}
        </div>
        <div v-if="t.urbandictionary">
          {{t.urbandictionary.list[0].definition}}
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
      </head>
      <body>
        <div id="app">${appString}</div>
      </body>
      <script src="https://unpkg.com/vue@${Vue.version}/dist/vue.js"></script>
      <script>${js(state)}</script>
    </html>
  `;
}

module.exports = function ui (req, res, next) {
  const state = {
    text: req.query.text,
    toLang: req.query.to,
    fromLang: req.query.from,
    otherLangs: OTHER_LANGS,
    topLangs: TOP_LANGS
  };
  const app = createApp(state);

  renderer.renderToString(app)
    .then(str => res.end(html(str, state)))
    .catch(next)
};
