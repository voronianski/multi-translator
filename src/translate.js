const googleTranslate = require('google-translate-api');
const { defaultLangs, dictitonaryLangs } = require('c0nfig');

const dictionaries = require('./dictionaries');

module.exports = function translate (req, res, next) {
  const text = req.query.text;

  if (!text) {
    return next({status: 400, text: 'text param is required'});
  }

  const fromLang = req.query.from || defaultLangs.from;
  const toLang = req.query.to || defaultLangs.to;

  const requests = [googleTranslate(text, {from: fromLang, to: toLang})];
  const additionalDicts = dictitonaryLangs[fromLang];

  if (additionalDicts && additionalDicts.length) {
    additionalDicts.forEach(dictName => {
      const dictionary = dictionaries[dictName]

      if (dictionary) {
        requests.push(dictionary(text));
      }
    });
  }

  Promise.all(requests)
    .then(responses => {
      res.json({
        googletranslate: responses[0],
        ...responses.reduce((memo, response) => {
          memo[response.name] = response.data;

          return memo;
        }, {})
      });
    })
    .catch(err => {
      next({status: 400, text: 'translate api error'});
    });
};
