function badRequest(message, details) {
  const error = new Error(message);
  error.status = 400;
  error.details = details;
  return error;
}

function unauthorized(message = "Unauthorized.") {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function forbidden(message = "Forbidden.") {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function notFound(message = "Not found.") {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function tooManyRequests(message = "Too many requests.") {
  const error = new Error(message);
  error.status = 429;
  return error;
}

module.exports = { badRequest, unauthorized, forbidden, notFound, tooManyRequests };
