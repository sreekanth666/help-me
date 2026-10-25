export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Bundles finished files into one ZIP (stored, since they are already compressed). */
export async function downloadZip(files: { name: string; blob: Blob }[], zipName: string) {
  const { downloadZip: zip } = await import('client-zip');
  const archive = await zip(
    files.map((f) => ({ name: f.name, input: f.blob, lastModified: new Date() })),
  ).blob();
  downloadBlob(archive, zipName);
}

/** Clipboards only accept PNG images reliably, so other formats are redrawn as PNG first. */
export async function copyImageToClipboard(blob: Blob) {
  let png = blob;
  if (blob.type !== 'image/png') {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();
    png = await canvas.convertToBlob({ type: 'image/png' });
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
