const express = require('express');
const logger = require('morgan');
const compression = require('compression');
const { port, env } = require('c0nfig');

const errors = require('./errors');
const translate = require('./translate');
const ui = require('./ui');

const app = express();

if ('test' !== env) {
  app.use(logger('dev'));
}

app.disable('x-powered-by');
app.use(compression());

app.get('/translate', translate);
app.get('/ui', ui);

app.use(errors.notfound);
app.use(errors.handler);

app.listen(port, () => {
  console.log(`multi-translator is listening on http://localhost:${port} env=${env}`);
});
