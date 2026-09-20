export function buildSynoParams(
  api: string,
  version: number,
  method: string,
  extraParams?: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
  const params: Record<string, string> = {
    api,
    version: String(version),
    method,
  };

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = String(value);
      }
    });
  }

  return params;
}

export function encodeTaskIds(ids: string[]): string {
  return ids.join(',');
}

export function buildMultipartBody(
  params: Record<string, string | number | boolean | undefined>,
  file?: File | Blob,
): FormData {
  const formData = new FormData();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, String(value));
    }
  });

  if (file) {
    formData.append('file', file);
  }

  return formData;
}

export function encodeUrls(urls: string[]): string {
  return urls.map(url => url.replace(/,/g, '%2C')).join(',');
}

export function buildUrlEncodedBody(
  params: Record<string, string | number | boolean | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}
