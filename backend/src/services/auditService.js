async function logValidation(clientOrPool, payload) {
  const runQuery = typeof clientOrPool === "function" ? clientOrPool : clientOrPool.query.bind(clientOrPool);
  await runQuery(
    `insert into validation_logs
      (business_id, campaign_id, game_id, qr_code_id, user_id, token_preview, result, message, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      payload.business_id || null,
      payload.campaign_id || null,
      payload.game_id || null,
      payload.qr_code_id || null,
      payload.user_id || null,
      payload.token_preview || null,
      payload.result,
      payload.message || null,
      payload.metadata || {},
    ]
  );
}

async function logQrEvent(clientOrPool, payload) {
  const runQuery = typeof clientOrPool === "function" ? clientOrPool : clientOrPool.query.bind(clientOrPool);
  await runQuery(
    `insert into qr_event_logs
      (business_id, campaign_id, qr_code_id, batch_id, player_id, user_id, event_type, message, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      payload.business_id || null,
      payload.campaign_id || null,
      payload.qr_code_id || null,
      payload.batch_id || null,
      payload.player_id || null,
      payload.user_id || null,
      payload.event_type,
      payload.message || null,
      payload.metadata || {},
    ]
  );
}

module.exports = { logValidation, logQrEvent };
