// src/api/barcodeApi.js

import { authenticatedRequest } from "./apiClient";

export async function lookupBarcode(code, options = {}) {
  const response = await authenticatedRequest(
    `/api/barcode/${encodeURIComponent(code)}`,
    {
      method: "GET",
      ...options,
    }
  );

  return response.json();
}
