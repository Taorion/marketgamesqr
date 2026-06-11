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
  return { status: response.status, ok: response.ok, data, text };
}

function summarizeOrder(order) {
  if (!order) return null;
  return {
    status: order.status,
    package_code: order.package_code,
    package_size: order.package_size,
    credited: Boolean(order.credited_at),
    has_checkout_url: Boolean(order.checkout_url),
    has_sandbox_checkout_url: Boolean(order.sandbox_checkout_url),
    has_preference_id: Boolean(order.mercado_pago_preference_id),
  };
}

async function main() {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.DEMO_OWNER_EMAIL || "owner@example.com",
      password: process.env.DEMO_OWNER_PASSWORD || "ChangeMe123!",
    }),
  });

  const result = {
    base_url: baseUrl,
    login: {
      status: login.status,
      ok: login.ok,
      user: login.data?.user
        ? {
            email: login.data.user.email,
            role: login.data.user.role,
            has_business: Boolean(login.data.user.business_id),
          }
        : null,
      error: login.data?.error,
    },
  };

  if (!login.ok || !login.data?.token) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const headers = { Authorization: `Bearer ${login.data.token}` };
  const ordersBefore = await request("/api/payments/qr-credits/orders", { headers });
  const demoPurchase = await request("/api/payments/qr-credits/checkout/demo", {
    method: "POST",
    headers,
    body: JSON.stringify({ package_code: process.env.PROBE_PACKAGE_CODE || "QR100" }),
  });
  const ordersAfterDemo = await request("/api/payments/qr-credits/orders", { headers });
  const checkout = await request("/api/payments/qr-credits/checkout", {
    method: "POST",
    headers,
    body: JSON.stringify({ package_code: process.env.PROBE_PACKAGE_CODE || "QR100" }),
  });

  result.orders_before = {
    status: ordersBefore.status,
    ok: ordersBefore.ok,
    count: ordersBefore.data?.orders?.length,
    latest: summarizeOrder(ordersBefore.data?.orders?.[0]),
    error: ordersBefore.data?.error,
  };
  result.demo_purchase = {
    status: demoPurchase.status,
    ok: demoPurchase.ok,
    demo: Boolean(demoPurchase.data?.demo),
    order: summarizeOrder(demoPurchase.data?.order),
    credit_account: demoPurchase.data?.credit_account
      ? {
          qr_balance: demoPurchase.data.credit_account.qr_balance,
          qr_purchased_total: demoPurchase.data.credit_account.qr_purchased_total,
          qr_used_total: demoPurchase.data.credit_account.qr_used_total,
        }
      : null,
    error: demoPurchase.data?.error,
    message: demoPurchase.data?.message,
    body: demoPurchase.ok ? undefined : demoPurchase.text.slice(0, 300),
  };
  result.orders_after_demo = {
    status: ordersAfterDemo.status,
    ok: ordersAfterDemo.ok,
    count: ordersAfterDemo.data?.orders?.length,
    latest: summarizeOrder(ordersAfterDemo.data?.orders?.[0]),
    error: ordersAfterDemo.data?.error,
  };
  result.checkout = {
    status: checkout.status,
    ok: checkout.ok,
    order: summarizeOrder(checkout.data?.order),
    error: checkout.data?.error,
    message: checkout.data?.message,
    body: checkout.ok ? undefined : checkout.text.slice(0, 300),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
