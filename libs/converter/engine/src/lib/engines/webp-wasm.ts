import type { EncodeOptions } from '@jsquash/webp/meta';

type WebpEncoder = typeof import('@jsquash/webp/encode');

/** Smallest valid module using a SIMD instruction; validates only where SIMD is supported. */
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
]);

let encoder: Promise<WebpEncoder> | null = null;

/**
 * jsquash resolves its wasm with a relative fetch, which fails inside a blob-URL worker. So the
 * bundler-emitted asset is fetched here against the page origin and handed over as bytes.
 */
function load(): Promise<WebpEncoder> {
  encoder ??= (async () => {
    const asset = WebAssembly.validate(SIMD_PROBE)
      ? new URL('../../../../../../node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm', import.meta.url)
      : new URL('../../../../../../node_modules/@jsquash/webp/codec/enc/webp_enc.wasm', import.meta.url);
    const response = await fetch(new URL(String(asset), self.location.origin));
    const wasmBinary = await response.arrayBuffer();
    const mod = await import('@jsquash/webp/encode');
    await mod.init({ wasmBinary } as never);
    return mod;
  })();
  encoder.catch(() => (encoder = null));
  return encoder;
}

export async function encodeWebp(
  image: ImageData,
  { quality, lossless }: { quality: number; lossless: boolean },
): Promise<ArrayBuffer> {
  const mod = await load();
  const options: Partial<EncodeOptions> = { quality, lossless: lossless ? 1 : 0, method: 4 };
  return mod.default(image, options);
}
