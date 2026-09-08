const test = require("node:test");
const assert = require("node:assert/strict");

const {
  interactiveActivationCreateSchema,
  interactiveActivationUpdateSchema,
} = require("../backend/src/utils/validators");

test("un medio de adquisición heredado no bloquea la creación de la activación", () => {
  const parsed = interactiveActivationCreateSchema.parse({
    activation_type: "SCRATCH_WIN",
    title: "Raspas",
    acquisition_channel_id: "__MANUAL__",
    reward_config: { reward_label: "Varios" },
  });

  assert.equal(parsed.acquisition_channel_id, null);
});

test("los UUID reales se conservan y la edición también limpia valores antiguos", () => {
  const channelId = "a13c5fde-24b8-4a5f-b5fd-e20790a73732";
  assert.equal(
    interactiveActivationCreateSchema.parse({
      activation_type: "SCRATCH_WIN",
      title: "Raspas",
      acquisition_channel_id: channelId,
      reward_config: { reward_label: "Varios" },
    }).acquisition_channel_id,
    channelId
  );
  assert.equal(
    interactiveActivationUpdateSchema.parse({ acquisition_channel_id: "Instagram" }).acquisition_channel_id,
    null
  );
});
