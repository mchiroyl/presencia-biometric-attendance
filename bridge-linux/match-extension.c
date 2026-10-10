/* School extension to libfprint 1.94.5, LGPL-2.1-or-later.
 * Uses the library's NBIS matcher on one captured template against EVERY employee.
 * Linked into fpi-print.c so no unsupported access to hidden shared-library symbols.
 * Source and this modification are shipped in the image for LGPL compliance.
 */
#include "fpi-print.h"
int
fp_school_match_serialized (const unsigned char *probe_data, size_t probe_len,
                            const unsigned char *stored_data, size_t stored_len)
{
  GError *error = NULL;
  FpPrint *probe = fp_print_deserialize (probe_data, probe_len, &error);
  FpPrint *stored = NULL;
  int result = -1;
  if (!probe) goto finish;
  stored = fp_print_deserialize (stored_data, stored_len, &error);
  if (!stored) goto finish;
  if (probe->type != FPI_PRINT_NBIS || stored->type != FPI_PRINT_NBIS || probe->prints->len == 0)
    goto finish;
  result = 0;
  /* An enrolled probe can contain several samples; NBIS expects exactly one.
   * Compare each sample, using independent owned copies so nothing aliases freed memory.
   * 40 is libfprint's default threshold for the uru4000 image driver.
   */
  for (guint i = 0; i < probe->prints->len; i++) {
    FpPrint *single = g_object_new (FP_TYPE_PRINT, "driver", fp_print_get_driver (probe), "device-id", fp_print_get_device_id (probe), NULL);
    fpi_print_set_type (single, FPI_PRINT_NBIS);
    g_ptr_array_add (single->prints, g_memdup2 (g_ptr_array_index (probe->prints, i), sizeof (struct xyt_struct)));
    result = fpi_print_bz3_match (stored, single, 40, &error);
    g_object_unref (single);
    if (result != 0) break;
  }
finish:
  if (error) { g_error_free (error); result = -1; }
  if (probe) g_object_unref (probe);
  if (stored) g_object_unref (stored);
  return result;
}
