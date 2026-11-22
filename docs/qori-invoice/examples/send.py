"""Python 3, standard library. Server only; secrets are never printed."""
import os, sys, json, base64, urllib.request, urllib.parse
base = os.environ.get("QORI_BASE_URL", "http://127.0.0.1:3197").rstrip("/")
url = urllib.parse.urlparse(base)
if url.scheme != "https" and url.hostname not in ("localhost", "127.0.0.1"):
    raise ValueError("HTTPS required")
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
opener = urllib.request.build_opener(NoRedirect)
def call(path, headers, data=None):
    req = urllib.request.Request(base + path, headers=headers, data=data)
    with opener.open(req, timeout=15) as response:
        return json.load(response)
credential = base64.b64encode((os.environ["QORI_CLIENT_ID"] + ":" + os.environ["QORI_CLIENT_SECRET"]).encode()).decode()
token = call("/api/invoice/v1/oauth/token", {"Authorization": "Basic " + credential, "Content-Type": "application/x-www-form-urlencoded"}, b"grant_type=client_credentials")
with open(sys.argv[1] if len(sys.argv)>1 else "developers/example.xml", encoding="utf-8") as source:
    xml = source.read()
headers = {"Authorization":"Bearer "+token["access_token"], "Content-Type":"application/json", "Idempotency-Key":os.environ["QORI_IDEMPOTENCY_KEY"]}
sent = call("/api/invoice/v1/invoices", headers, json.dumps({"issuer_nit":"900000000","xml":xml}).encode())
print(json.dumps(sent))
print(json.dumps(call("/api/invoice/v1/receipts/"+sent["submission_id"], {"Authorization":headers["Authorization"]})))
