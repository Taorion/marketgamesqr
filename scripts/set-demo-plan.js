const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || data.message || `${path} failed`);
  }
  return data;
}

async function main() {
  const admin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
      password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
    }),
  });
  const owner = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.DEMO_OWNER_EMAIL || "owner@example.com",
      password: process.env.DEMO_OWNER_PASSWORD || "ChangeMe123!",
    }),
  });

  const businessId = owner.user?.business_id;
  if (!businessId) {
    throw new Error("Demo owner does not have a business_id.");
  }

  const updated = await request(`/api/admin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({ plan_code: process.env.DEMO_PLAN_CODE || "GROWTH" }),
  });

  console.log(JSON.stringify({
    ok: true,
    business_id: businessId,
    plan: updated.subscription?.plan?.code,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
