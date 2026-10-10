import unittest
from security import authorized, sign_assertion

class SecurityTests(unittest.TestCase):
    def test_valid_origin_and_token(self):
        self.assertTrue(authorized('/?token=secret', 'http://localhost:5173', 'secret', ['http://localhost:5173']))

    def test_rejects_origin_missing_token_duplicates_and_wrong_token(self):
        for path, origin in [('/', 'http://localhost:5173'), ('/?token=bad', 'http://localhost:5173'), ('/?token=secret&token=secret', 'http://localhost:5173'), ('/?token=secret', 'https://evil.example'), ('/?token=secret', None)]:
            self.assertFalse(authorized(path, origin, 'secret', ['http://localhost:5173']))

    def test_interoperable_signature_and_tampering(self):
        import hashlib, hmac
        value = dict(deviceId='local-reader-01', employeeId='employee', captureId='capture', capturedAt='2026-10-10T12:00:00.000Z', mode='hardware')
        expected = hmac.new(bytes.fromhex('a' * 64), b'local-reader-01\nemployee\ncapture\n2026-10-10T12:00:00.000Z\nhardware', hashlib.sha256).hexdigest()
        self.assertEqual(sign_assertion(value, 'a' * 64), expected)
        value['employeeId'] = 'other'
        self.assertNotEqual(sign_assertion(value, 'a' * 64), expected)

if __name__ == '__main__':
    unittest.main()
