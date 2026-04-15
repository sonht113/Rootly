const MIME_TYPE_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extractPublicStorageObjectPath(
  publicUrl: string | null | undefined,
  {
    baseUrl,
    bucket,
  }: {
    baseUrl: string;
    bucket: string;
  },
) {
  const normalizedUrl = publicUrl?.trim();

  if (!normalizedUrl) {
    return null;
  }

  const publicPrefix = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;

  if (!normalizedUrl.startsWith(publicPrefix)) {
    return null;
  }

  return decodeURIComponent(normalizedUrl.slice(publicPrefix.length).split("?")[0] ?? "");
}

export function getFileExtension(fileName: string, mimeType: string) {
  const normalizedFileName = fileName.trim().toLowerCase();
  const fileNameExtension = normalizedFileName.includes(".")
    ? normalizedFileName.split(".").pop()?.trim()
    : "";

  if (fileNameExtension) {
    return fileNameExtension;
  }

  return MIME_TYPE_EXTENSION_MAP[mimeType] ?? "bin";
}
