const request = require('superagent');

function urbandictionary (term) {
  const url = 'https://api.urbandictionary.com/v0/define';

  return new Promise((resolve, reject) => {
    request.get(url).query({ term })
      .then(res => {
        resolve({
          name: 'urbandictionary',
          data: res.body || {}
        });
      })
      .catch(err => {
        reject(err);
      });
  });
}

module.exports = {
  urbandictionary
};
