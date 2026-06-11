const payload = require("./generate-qr-payload.json");

async function main() {
  const response = await fetch("http://localhost:3000/api/qr/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Game-Api-Key": "REPLACE_WITH_GAME_API_KEY",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data, null, 2));
  }

  console.log("QR content:", data.qr_content);
  console.log("QR image data URL:", data.qr_image_data_url);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
