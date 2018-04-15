function notfound (req, res, next) {
  next({status: '404', text: 'not found'});
}

function handler (err, req, res, next) {
  let status = err.status || 500;
  let text = err.text || 'internal server error';

  if (status === 500) {
    console.error(err.stack);
  }

  res.status(status).json({ status, text });
}

module.exports = {
  notfound,
  handler
};
