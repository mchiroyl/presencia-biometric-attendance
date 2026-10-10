import hashlib
import hmac
from urllib.parse import parse_qs, urlsplit

def authorized(path, origin, token, origins):
    values = parse_qs(urlsplit(path).query, keep_blank_values=True).get('token', [])
    return origin in origins and len(values) == 1 and hmac.compare_digest(values[0].encode(), token.encode())

def sign_assertion(assertion, key):
    body = '\n'.join(assertion[k] for k in ('deviceId', 'employeeId', 'captureId', 'capturedAt', 'mode'))
    return hmac.new(bytes.fromhex(key), body.encode(), hashlib.sha256).hexdigest()
