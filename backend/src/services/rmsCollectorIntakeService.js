const RMS_SOURCE_TYPES = new Set(["PLAYER", "MANUAL", "AFFILIATE"]);

function normalizedSource(payload = {}) {
  const proposedType = String(payload.source_type || (payload.player_id ? "PLAYER" : "")).toUpperCase();
  const sourceType = RMS_SOURCE_TYPES.has(proposedType) ? proposedType : "";
  const sourceId = payload.source_id || (sourceType === "PLAYER" ? payload.player_id : null);
  if (!sourceType || !sourceId) {
    throw new TypeError("source_type y source_id son obligatorios para ingresar el lead al Recolector.");
  }
  return { sourceType, sourceId };
}

function intakeMetadata(payload = {}) {
  return {
    source: "activity_qr_generated",
    qr_code_id: payload.qr_code_id,
    activation_id: payload.activation_id || null,
    activation_type: payload.activation_type || null,
    activation_name: payload.activation_name || null,
    campaign_id: payload.campaign_id || null,
    participant_id: payload.participant_id || null,
  };
}

async function registerActivityQrInCollector(client, payload = {}) {
  if (!client?.query) throw new TypeError("Se requiere una transaccion de base de datos activa.");
  if (!payload.business_id || !payload.qr_code_id) {
    throw new TypeError("business_id y qr_code_id son obligatorios para ingresar el lead al Recolector.");
  }
  const { sourceType, sourceId } = normalizedSource(payload);
  const leadId = payload.lead_id || (sourceType === "PLAYER" ? sourceId : null);
  const metadata = intakeMetadata(payload);
  const params = [payload.business_id, sourceType, sourceId, leadId, JSON.stringify(metadata)];
  const stateResult = await client.query(
    `insert into rms_lead_state
      (business_id, source_type, source_id, lead_id, rms_phase, priority,
       recommended_action, last_operation, metadata)
     values ($1, $2, $3, $4, 'recoleccion', 'MEDIUM',
       'Revisar datos capturados por la actividad y decidir si entra al embudo.',
       'activity_qr_generated', $5::jsonb)
     on conflict (business_id, source_type, source_id) do nothing
     returning id`,
    params
  );

  if (stateResult.rowCount) {
    await client.query(
      `insert into rms_phase_movements
        (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
       values ($1, $2, $3, $4, null, 'recoleccion',
         'QR generado por actividad publica.', $5::jsonb)`,
      params
    );
  }

  await client.query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title,
       event_description, rms_phase, operation_key, material_type, metadata)
     values ($1, $2, $3, $4, 'activity_qr_collected',
       'Lead recibido desde actividad', $5, 'recoleccion',
       'collect_activity_qr', 'qr_activacion_formulario', $6::jsonb)`,
    [
      payload.business_id,
      sourceType,
      sourceId,
      leadId,
      payload.activation_name
        ? `El lead genero un QR en la actividad ${payload.activation_name}.`
        : "El lead genero un QR en una actividad publica.",
      JSON.stringify(metadata),
    ]
  );

  return { inserted: Boolean(stateResult.rowCount), phase: "recoleccion", source_type: sourceType, source_id: sourceId };
}

module.exports = {
  registerActivityQrInCollector,
};
