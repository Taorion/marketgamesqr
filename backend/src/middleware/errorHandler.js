function errorHandler(error, _req, res, _next) {
  if(error.code==='P0001' && /^(Pensé en ti|Programa gratuito)/.test(error.message||''))error.status=403;
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      message: error.publicMessage || error.message || "Internal server error.",
      details: error.details,
    },
  });
}

module.exports = { errorHandler };
