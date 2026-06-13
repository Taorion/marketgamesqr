const { pool } = require("../backend/src/config/db");

const INDEXES = [
  {
    name: "idx_cc_players_business_created",
    sql: "create index concurrently if not exists idx_cc_players_business_created on players (business_id, created_at desc)"
  },
  {
    name: "idx_cc_players_business_campaign_created",
    sql: "create index concurrently if not exists idx_cc_players_business_campaign_created on players (business_id, campaign_id, created_at desc)"
  },
  {
    name: "idx_cc_questionnaires_player",
    sql: "create index concurrently if not exists idx_cc_questionnaires_player on questionnaires (player_id)"
  },
  {
    name: "idx_cc_questionnaires_business_campaign_created",
    sql: "create index concurrently if not exists idx_cc_questionnaires_business_campaign_created on questionnaires (business_id, campaign_id, created_at desc)"
  },
  {
    name: "idx_cc_qr_business_created",
    sql: "create index concurrently if not exists idx_cc_qr_business_created on qr_codes (business_id, created_at desc)"
  },
  {
    name: "idx_cc_qr_business_campaign_created",
    sql: "create index concurrently if not exists idx_cc_qr_business_campaign_created on qr_codes (business_id, campaign_id, created_at desc)"
  },
  {
    name: "idx_cc_qr_business_status_created",
    sql: "create index concurrently if not exists idx_cc_qr_business_status_created on qr_codes (business_id, status, created_at desc)"
  },
  {
    name: "idx_cc_qr_business_origin_created",
    sql: "create index concurrently if not exists idx_cc_qr_business_origin_created on qr_codes (business_id, origin_type, created_at desc)"
  },
  {
    name: "idx_cc_qr_business_affiliate_created",
    sql: "create index concurrently if not exists idx_cc_qr_business_affiliate_created on qr_codes (business_id, affiliate_id, created_at desc)"
  },
  {
    name: "idx_cc_qr_batch",
    sql: "create index concurrently if not exists idx_cc_qr_batch on qr_codes (batch_id)"
  },
  {
    name: "idx_cc_redemptions_business_redeemed",
    sql: "create index concurrently if not exists idx_cc_redemptions_business_redeemed on redemptions (business_id, redeemed_at desc)"
  },
  {
    name: "idx_cc_redemptions_business_campaign_redeemed",
    sql: "create index concurrently if not exists idx_cc_redemptions_business_campaign_redeemed on redemptions (business_id, campaign_id, redeemed_at desc)"
  },
  {
    name: "idx_cc_redemptions_business_branch_redeemed",
    sql: "create index concurrently if not exists idx_cc_redemptions_business_branch_redeemed on redemptions (business_id, branch_id, redeemed_at desc)"
  },
  {
    name: "idx_cc_redemptions_qr",
    sql: "create index concurrently if not exists idx_cc_redemptions_qr on redemptions (qr_code_id)"
  },
  {
    name: "idx_cc_attributed_sales_business_created",
    sql: "create index concurrently if not exists idx_cc_attributed_sales_business_created on attributed_sales (business_id, created_at desc)"
  },
  {
    name: "idx_cc_attributed_sales_business_campaign_created",
    sql: "create index concurrently if not exists idx_cc_attributed_sales_business_campaign_created on attributed_sales (business_id, campaign_id, created_at desc)"
  },
  {
    name: "idx_cc_attributed_sales_business_branch_created",
    sql: "create index concurrently if not exists idx_cc_attributed_sales_business_branch_created on attributed_sales (business_id, branch_id, created_at desc)"
  },
  {
    name: "idx_cc_attributed_sales_qr",
    sql: "create index concurrently if not exists idx_cc_attributed_sales_qr on attributed_sales (qr_code_id)"
  },
  {
    name: "idx_cc_business_sales_business_created",
    sql: "create index concurrently if not exists idx_cc_business_sales_business_created on business_sales (business_id, created_at desc)"
  },
  {
    name: "idx_cc_business_sales_business_campaign_created",
    sql: "create index concurrently if not exists idx_cc_business_sales_business_campaign_created on business_sales (business_id, campaign_id, created_at desc)"
  },
  {
    name: "idx_cc_business_sales_business_branch_created",
    sql: "create index concurrently if not exists idx_cc_business_sales_business_branch_created on business_sales (business_id, branch_id, created_at desc)"
  },
  {
    name: "idx_cc_business_sales_business_channel_created",
    sql: "create index concurrently if not exists idx_cc_business_sales_business_channel_created on business_sales (business_id, acquisition_channel, created_at desc)"
  },
  {
    name: "idx_cc_business_sales_business_affiliate_created",
    sql: "create index concurrently if not exists idx_cc_business_sales_business_affiliate_created on business_sales (business_id, referred_affiliate_id, created_at desc)"
  },
  {
    name: "idx_cc_business_sales_qr",
    sql: "create index concurrently if not exists idx_cc_business_sales_qr on business_sales (qr_code_id)"
  },
  {
    name: "idx_cc_campaigns_business",
    sql: "create index concurrently if not exists idx_cc_campaigns_business on campaigns (business_id)"
  },
  {
    name: "idx_cc_branches_business",
    sql: "create index concurrently if not exists idx_cc_branches_business on branches (business_id)"
  },
  {
    name: "idx_cc_affiliates_business_status",
    sql: "create index concurrently if not exists idx_cc_affiliates_business_status on affiliates (business_id, status)"
  },
  {
    name: "idx_cc_qr_batches_business_campaign_channel",
    sql: "create index concurrently if not exists idx_cc_qr_batches_business_campaign_channel on qr_batches (business_id, campaign_id, channel_use)"
  }
];

async function main() {
  const startedAt = Date.now();
  const results = [];
  for (const item of INDEXES) {
    const indexStart = Date.now();
    await pool.query(item.sql);
    results.push({ index: item.name, elapsed_ms: Date.now() - indexStart });
  }
  console.log(JSON.stringify({ indexes: results, total_ms: Date.now() - startedAt }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
