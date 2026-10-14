import sharp from 'sharp';
const DEFAULT_LIMIT = 4 * 1024 * 1024;
export function storageImageLimit(bucketLimit: unknown): number {
  const limit = Number(bucketLimit);
  return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), DEFAULT_LIMIT) : DEFAULT_LIMIT;
}
/** Keep PNG compatibility and the complete page; resize proportionally without cropping. */
export async function fitStorageImage(input: Buffer, maxBytes: number): Promise<Buffer> {
  if (!Number.isFinite(maxBytes) || maxBytes < 1024) throw new Error('Screenshot storage limit is too small. Increase the bucket file size limit.');
  if (input.length <= maxBytes) return input;
  const metadata = await sharp(input, {limitInputPixels:60_000_000}).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Cannot prepare an invalid screenshot for upload.');
  let width = metadata.width;
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await sharp(input, {limitInputPixels:60_000_000})
      .resize({width, withoutEnlargement:true})
      .png({compressionLevel:9, palette:true, colours:256, dither:0})
      .toBuffer();
    if (result.length <= maxBytes) return result;
    const next = Math.max(64, Math.floor(width * Math.min(0.8, Math.sqrt(maxBytes / result.length) * 0.9)));
    if (next >= width) break;
    width = next;
  }
  throw new Error(`Screenshot could not fit the storage limit of ${(maxBytes / 1024 / 1024).toFixed(2)} MB. Increase the bucket file size limit.`);
}
