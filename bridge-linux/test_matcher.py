import unittest
import gi
gi.require_version('FPrint', '2.0')
from matcher import matching_employees

class MatchTests(unittest.TestCase):
    def test_multiple_employees_are_not_silently_resolved(self):
        calls = []
        def compare(probe, enrolled):
            calls.append((probe, enrolled))
            return enrolled != b'other'
        matches = matching_employees(b'single-probe', [('a', b'first'), ('b', b'other'), ('c', b'third')], compare)
        self.assertEqual(matches, ['a', 'c'])
        self.assertEqual(len(calls), 3)
        self.assertTrue(all(p == b'single-probe' for p, _ in calls))

    def test_no_match(self):
        self.assertEqual(matching_employees(b'probe', [('a', b'template')], lambda *_: False), [])

    def test_native_malformed_template_fails_closed(self):
        from matcher import native_match
        with self.assertRaises(ValueError):
            native_match(b'invalid', b'invalid')

    def test_native_self_match_and_multi_sample_enrollment(self):
        # Minucias construidas solo en esta prueba, nunca un lector ni datos de empleados.
        # Valida serialización y comparación C real; no sustituye una captura física.
        from gi.repository import GLib, FPrint
        from matcher import native_match
        xs = [i * 3 for i in range(100)]
        ys = [(i * i % 97) * 3 for i in range(100)]
        angles = [(i * 37 % 360) - 180 for i in range(100)]
        sample = (xs, ys, angles)
        def serialize(samples):
            variant = GLib.Variant('(issbymsmsia{sv}v)', (2, 'uru4000', 'test-only', False, 0, None, None, -2147483648, {}, GLib.Variant('(a(aiaiai))', (samples,))))
            data = b'FP3' + variant.get_data_as_bytes().get_data()
            FPrint.Print.deserialize(data)
            return data
        one = serialize([sample])
        multiple = serialize([sample, sample])
        self.assertTrue(native_match(one, multiple))
        self.assertTrue(native_match(multiple, one))

if __name__ == '__main__':
    unittest.main()
