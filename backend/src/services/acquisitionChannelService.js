const { badRequest } = require("../utils/http");

/**
 * Resolves a new commercial-acquisition selection within the current tenant.
 * Contact channels (WhatsApp, email, call) deliberately do not use this helper.
 */
async function resolveAcquisitionChannelReference(client, businessId, payload = {}, options = {}) {
  const channelId = payload.acquisition_channel_id || null;
  const manualName = String(payload.acquisition_channel || "").trim() || null;
  if (!channelId) {
    return {
      acquisition_channel_id: null,
      acquisition_channel_name_snapshot: manualName,
      acquisition_channel_slug_snapshot: null,
      acquisition_channel_source: manualName ? "MANUAL_UNCONFIGURED" : null,
      acquisition_channel: manualName,
    };
  }

  const result = await client.query(
    `select id, name, slug, status
       from business_acquisition_channels
      where id = $1 and business_id = $2`,
    [channelId, businessId]
  );
  const channel = result.rows[0];
  if (!channel) throw badRequest("El canal de adquisición no pertenece a este negocio.");
  if (!options.allowHistorical && channel.status !== "ACTIVE") {
    throw badRequest("Solo puedes seleccionar canales de adquisición activos.");
  }
  return {
    acquisition_channel_id: channel.id,
    acquisition_channel_name_snapshot: channel.name,
    acquisition_channel_slug_snapshot: channel.slug || null,
    acquisition_channel_source: "CONFIGURED",
    acquisition_channel: channel.name,
  };
}

module.exports = { resolveAcquisitionChannelReference };
