const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  return { ok: response.ok, status: response.status, data, text };
}

async function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

function summarizeSubscription(subscription) {
  const plan = subscription?.plan;
  return plan
    ? {
        code: plan.code,
        name: plan.name,
        category: plan.category,
        portal_access: Boolean(plan.features?.portal_access),
        leads_export: Boolean(plan.features?.leads_export),
        affiliates: Boolean(plan.features?.affiliates),
        monthly_qr_included: plan.limits?.monthly_qr_included,
      }
    : null;
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const owner = await login(
    process.env.DEMO_OWNER_EMAIL || "owner@example.com",
    process.env.DEMO_OWNER_PASSWORD || "ChangeMe123!"
  );
  const admin = await login(
    process.env.SEED_ADMIN_EMAIL || "admin@example.com",
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!"
  );

  const result = {
    owner_login: {
      status: owner.status,
      ok: owner.ok,
      role: owner.data?.user?.role,
      subscription: summarizeSubscription(owner.data?.user?.subscription),
    },
    admin_login: {
      status: admin.status,
      ok: admin.ok,
      role: admin.data?.user?.role,
    },
  };

  if (owner.data?.token) {
    const headers = { Authorization: `Bearer ${owner.data.token}` };
    const profile = await request("/api/business/profile", { headers });
    result.business_profile = {
      status: profile.status,
      ok: profile.ok,
      subscription: summarizeSubscription(profile.data?.subscription),
      error: profile.data?.error,
    };
  }

  if (admin.data?.token) {
    const headers = { Authorization: `Bearer ${admin.data.token}` };
    const plans = await request("/api/admin/subscription-plans", { headers });
    result.admin_plans = {
      status: plans.status,
      ok: plans.ok,
      count: plans.data?.plans?.length,
      codes: plans.data?.plans?.map((plan) => plan.code),
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
