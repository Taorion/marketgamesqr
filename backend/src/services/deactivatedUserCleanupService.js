const { query } = require("../config/db");

async function purgeExpiredDeactivatedUsers() {
  const result = await query(
    `delete from app_users candidate
     where candidate.is_active = false
       and candidate.deactivated_at is not null
       and candidate.deactivated_at <= now() - interval '7 days'
       and exists (
         select 1
         from app_users owner
         where owner.business_id = candidate.business_id
           and owner.role = 'BUSINESS_OWNER'
           and owner.is_active = true
       )
     returning candidate.id, candidate.business_id`
  );
  if (result.rowCount) {
    console.log(`Removed ${result.rowCount} deactivated business user(s) after the 7-day retention period.`);
  }
  return result.rowCount;
}

function startDeactivatedUserCleanup() {
  purgeExpiredDeactivatedUsers().catch((error) => {
    console.error("Initial deactivated-user cleanup failed", error.message);
  });
  const timer = setInterval(() => {
    purgeExpiredDeactivatedUsers().catch((error) => {
      console.error("Scheduled deactivated-user cleanup failed", error.message);
    });
  }, 12 * 60 * 60 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = { purgeExpiredDeactivatedUsers, startDeactivatedUserCleanup };
