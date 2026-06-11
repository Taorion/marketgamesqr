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
    throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const runId = Date.now().toString().slice(-8);
  const documentId = `90${runId}`.slice(0, 10);
  const phone = `300${runId}`.slice(0, 10);

  const health = await request("/api/health");
  if (!health.ok) {
    throw new Error("Health check failed.");
  }

  const generated = await request("/api/public/demo/form-qr/qr", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Demo",
      lastName: "Cliente",
      documentId,
      email: `demo.cliente.${runId}@example.com`,
      phone,
      campaignLabel: "Smoke test demo",
      source: "demo-smoke-test",
    }),
  });

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.DEMO_VALIDATOR_EMAIL || "validator@example.com",
      password: process.env.DEMO_VALIDATOR_PASSWORD || "ChangeMe123!",
    }),
  });

  const token = new URL(generated.validator_url).searchParams.get("token");
  const validation = await request(`/api/qr/validate/${encodeURIComponent(token)}`, {
    headers: {
      Authorization: `Bearer ${login.token}`,
    },
  });

  console.log(JSON.stringify({
    ok: true,
    generated_qr: generated.validator_url,
    status: validation.status,
    allowed: validation.allowed,
    player: validation.player?.name,
    document_id: validation.player?.document_id,
    phone: validation.player?.phone,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
