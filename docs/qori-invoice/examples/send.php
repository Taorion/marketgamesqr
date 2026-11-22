<?php
// PHP 8 + cURL, server only. Never embed in public HTML.
$base = rtrim(getenv('QORI_BASE_URL') ?: 'http://127.0.0.1:3197', '/');
$url = parse_url($base);
if (($url['scheme'] ?? '') !== 'https' && !in_array($url['host'] ?? '', ['localhost','127.0.0.1'], true)) throw new Exception('HTTPS required');
function callQori(string $path, array $headers, ?string $body = null): array {
    global $base;
    $c = curl_init($base . $path);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>15, CURLOPT_FOLLOWLOCATION=>false, CURLOPT_HTTPHEADER=>$headers]);
    if ($body !== null) curl_setopt_array($c, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$body]);
    $raw = curl_exec($c); $status = curl_getinfo($c, CURLINFO_RESPONSE_CODE); curl_close($c);
    if ($raw === false || $status < 200 || $status >= 300) throw new Exception('Qori HTTP ' . $status);
    return json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
}
$id=getenv('QORI_CLIENT_ID');$secret=getenv('QORI_CLIENT_SECRET');$key=getenv('QORI_IDEMPOTENCY_KEY');
if (!$id || !$secret || !$key) throw new Exception('Configure QORI_CLIENT_ID, QORI_CLIENT_SECRET and QORI_IDEMPOTENCY_KEY');
$token=callQori('/api/invoice/v1/oauth/token',['Authorization: Basic '.base64_encode($id.':'.$secret),'Content-Type: application/x-www-form-urlencoded'],'grant_type=client_credentials');
$headers=['Authorization: Bearer '.$token['access_token'],'Content-Type: application/json','Idempotency-Key: '.$key];
$xml=file_get_contents($argv[1] ?? 'developers/example.xml');
$sent=callQori('/api/invoice/v1/invoices',$headers,json_encode(['issuer_nit'=>'900000000','xml'=>$xml],JSON_THROW_ON_ERROR));
echo json_encode($sent),PHP_EOL;
echo json_encode(callQori('/api/invoice/v1/receipts/'.$sent['submission_id'],[$headers[0]])),PHP_EOL;
