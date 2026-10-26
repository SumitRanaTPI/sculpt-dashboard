export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFile(type: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([" "], "sculpt-archive.md", { type })] });
  } catch {
    return false;
  }
}

export async function shareBlob(blob: Blob, filename: string, type: string): Promise<void> {
  const file = new File([blob], filename, { type });
  await navigator.share({ files: [file], title: filename });
}
