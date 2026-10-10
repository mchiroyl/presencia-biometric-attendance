import ctypes

def native_match(probe, stored):
    library = ctypes.CDLL('libfprint-2.so.2')
    match = library.fp_school_match_serialized
    match.argtypes = (ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t)
    match.restype = ctypes.c_int
    a = ctypes.create_string_buffer(probe)
    b = ctypes.create_string_buffer(stored)
    result = match(a, len(probe), b, len(stored))
    if result < 0:
        raise ValueError('Invalid biometric comparison')
    return result == 1

def matching_employees(probe, records, compare=native_match):
    # Una única captura se compara con todos. Nunca elegir arbitrariamente al primero.
    return sorted({employee for employee, template in records if compare(probe, template)})
