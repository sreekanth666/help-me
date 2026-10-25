import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * End-to-end check of the media converter in a real browser. Fixtures are generated in the page
 * (a canvas PNG, a recorded WebM) so no binary files live in the repo. The engine's decisions are
 * unit-tested; this proves the worker, the codecs and the UI work together.
 *
 * Playwright's Chromium can encode H.264 and VP9 but has no native AAC, so the MP4 test also
 * exercises the lazy-loaded wasm AAC encoder.
 */
test.describe('media converter', () => {
  test.setTimeout(120_000);

  const hydrated = (page: Page) =>
    expect(page.getByRole('button', { name: /^Switch to/ })).toBeEnabled();

  test.beforeEach(async ({ page }) => {
    await page.goto('/converter');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await hydrated(page);
  });

  /** A noisy, therefore not tiny, PNG drawn on a canvas. */
  async function makePng(page: Page): Promise<Buffer> {
    const base64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      const gradient = ctx.createLinearGradient(0, 0, 640, 480);
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(1, '#f97316');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#fff';
      ctx.font = '48px sans-serif';
      ctx.fillText('Help Me', 200, 250);
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b as Blob), 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      bytes.forEach((b) => (s += String.fromCharCode(b)));
      return btoa(s);
    });
    return Buffer.from(base64, 'base64');
  }

  /**
   * A short recording with a moving picture and a tone, made from a canvas and an oscillator.
   * Chrome saves VP9 recordings as real WebM but H.264 ones as Matroska, still named .webm.
   */
  async function makeWebm(page: Page, mimeType = 'video/webm;codecs=vp9,opus'): Promise<Buffer> {
    const base64 = await page.evaluate(async (type) => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      const video = canvas.captureStream(30);

      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const dest = audioCtx.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      const stream = new MediaStream([...video.getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const recorder = new MediaRecorder(stream, { mimeType: type });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise<void>((r) => (recorder.onstop = () => r()));
      recorder.start(200);

      const start = performance.now();
      await new Promise<void>((resolve) => {
        const draw = () => {
          const t = (performance.now() - start) / 1000;
          ctx.fillStyle = `hsl(${(t * 120) % 360} 80% 50%)`;
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#fff';
          ctx.fillRect(20 + ((t * 100) % 240), 100, 40, 40);
          if (t < 2) requestAnimationFrame(draw);
          else resolve();
        };
        draw();
      });
      recorder.stop();
      await stopped;
      osc.stop();
      await audioCtx.close();

      const blob = new Blob(chunks, { type: 'video/webm' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      bytes.forEach((b) => (s += String.fromCharCode(b)));
      return btoa(s);
    }, mimeType);
    return Buffer.from(base64, 'base64');
  }

  async function drop(page: Page, name: string, mimeType: string, buffer: Buffer) {
    await page.getByTestId('file-input').setInputFiles({ name, mimeType, buffer });
  }

  async function downloadOf(page: Page, button: Locator): Promise<Buffer> {
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    const path = await download.path();
    return readFile(path);
  }

  const ascii = (b: Buffer, from: number, to: number) => b.subarray(from, to).toString('latin1');

  test('landing page links to the converter', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Media Converter/ }).click();
    await expect(page).toHaveURL(/\/converter$/);
  });

  test('converts a PNG to a smaller WebP', async ({ page }) => {
    await drop(page, 'logo.png', 'image/png', await makePng(page));
    const item = page.getByTestId('queue-item');
    await expect(item.getByText(/640×480/)).toBeVisible();
    await expect(item.getByLabel('Convert logo.png to')).toHaveValue('webp');

    await page.getByRole('button', { name: 'Convert all' }).click();
    await expect(item.getByTestId('result-size')).toBeVisible();

    const webp = await downloadOf(page, item.getByRole('button', { name: /Download logo\.webp/ }));
    expect(ascii(webp, 0, 4)).toBe('RIFF');
    expect(ascii(webp, 8, 12)).toBe('WEBP');
    await expect(item.getByTestId('savings')).toContainText('−');
  });

  test('converts a PNG to JPEG and a WebP back to PNG', async ({ page }) => {
    await drop(page, 'logo.png', 'image/png', await makePng(page));
    const item = page.getByTestId('queue-item');
    await expect(item.getByText(/640×480/)).toBeVisible();
    await item.getByLabel('Convert logo.png to').selectOption('jpeg');
    await page.getByRole('button', { name: 'Convert all' }).click();
    const jpeg = await downloadOf(page, item.getByRole('button', { name: /Download logo\.jpeg|Download logo\.jpg/ }));
    expect([...jpeg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

    // Back the other way: WebP in, PNG out.
    await page.getByRole('button', { name: 'Clear' }).click();
    await drop(page, 'again.png', 'image/png', await makePng(page));
    await page.getByRole('button', { name: 'Convert all' }).click();
    const webp = await downloadOf(page, page.getByRole('button', { name: /Download again\.webp/ }));
    await page.getByRole('button', { name: 'Clear' }).click();

    await drop(page, 'again.webp', 'image/webp', webp);
    await expect(page.getByTestId('queue-item').getByLabel('Convert again.webp to')).toHaveValue('png');
    await page.getByRole('button', { name: 'Convert all' }).click();
    const png = await downloadOf(page, page.getByRole('button', { name: /Download again\.png/ }));
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  test('lossless WebP and the resize setting use the settings panel', async ({ page }) => {
    await page.getByLabel('Resize longest side to').selectOption('256');
    await page.getByRole('switch', { name: 'Lossless WebP' }).click();
    await drop(page, 'logo.png', 'image/png', await makePng(page));
    await page.getByRole('button', { name: 'Convert all' }).click();
    const item = page.getByTestId('queue-item');
    await expect(item.getByTestId('result-size')).toBeVisible();
    await expect(item.getByText('WebAssembly encoder')).toBeVisible(); // lossless always uses wasm

    // Feed the result back in: 640x480 resized to a 256px longest side is 256x192.
    const webp = await downloadOf(page, item.getByRole('button', { name: /Download logo\.webp/ }));
    await page.getByRole('button', { name: 'Clear' }).click();
    await drop(page, 'small.webp', 'image/webp', webp);
    await expect(page.getByTestId('queue-item').getByText(/256×192/)).toBeVisible();
  });

  test('converts WebM to MP4 and back to WebM', async ({ page }) => {
    await drop(page, 'clip.webm', 'video/webm', await makeWebm(page));
    const item = page.getByTestId('queue-item');
    await expect(item.getByText('Re-encoded')).toBeVisible();
    await expect(item.getByLabel('Convert clip.webm to')).toHaveValue('mp4');

    await page.getByRole('button', { name: 'Convert all' }).click();
    await expect(item.getByTestId('result-size')).toBeVisible({ timeout: 90_000 });
    const mp4 = await downloadOf(page, item.getByRole('button', { name: /Download clip\.mp4/ }));
    expect(ascii(mp4, 4, 8)).toBe('ftyp');

    await page.getByRole('button', { name: 'Clear' }).click();
    await drop(page, 'clip.mp4', 'video/mp4', mp4);
    const back = page.getByTestId('queue-item');
    await expect(back.getByLabel('Convert clip.mp4 to')).toHaveValue('webm');
    await page.getByRole('button', { name: 'Convert all' }).click();
    await expect(back.getByTestId('result-size')).toBeVisible({ timeout: 90_000 });
    const webm = await downloadOf(page, back.getByRole('button', { name: /Download clip\.webm/ }));
    expect([...webm.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  });

  test('accepts a .webm that is really Matroska with H.264, as Chrome records it', async ({ page }) => {
    const recording = await makeWebm(page, 'video/webm;codecs=h264,opus');
    expect(ascii(recording, 0, 64)).toContain('matroska'); // the fixture is the awkward kind

    await drop(page, 'recording.webm', 'video/webm', recording);
    const item = page.getByTestId('queue-item');
    await expect(item.getByText(/WebM · H\.264/)).toBeVisible();
    await expect(item.getByLabel('Convert recording.webm to')).toHaveValue('mp4');
    // H.264 already plays everywhere in MP4, so only the audio needs re-encoding.
    await page.getByRole('button', { name: 'Convert all' }).click();
    const mp4 = await downloadOf(page, item.getByRole('button', { name: /Download recording\.mp4/ }));
    expect(ascii(mp4, 4, 8)).toBe('ftyp');
  });

  test('fast copy re-wraps WebM as MP4 without re-encoding', async ({ page }) => {
    await page.getByRole('switch', { name: /Keep original codecs/ }).click();
    await drop(page, 'clip.webm', 'video/webm', await makeWebm(page));
    const item = page.getByTestId('queue-item');
    await expect(item.getByText('Fast copy')).toBeVisible();
    await page.getByRole('button', { name: 'Convert all' }).click();
    const mp4 = await downloadOf(page, item.getByRole('button', { name: /Download clip\.mp4/ }));
    expect(ascii(mp4, 4, 8)).toBe('ftyp');
  });

  test('rejects an unsupported file with a reason', async ({ page }) => {
    await drop(page, 'notes.txt', 'text/plain', Buffer.from('hello world, definitely not an image'));
    await expect(page.getByText(/Unsupported file/)).toBeVisible();
  });

  test('loads no codec code until a conversion needs it', async ({ page }) => {
    const loaded: string[] = [];
    page.on('request', (r) => /\.(js|wasm)(\?|$)/.test(r.url()) && loaded.push(r.url()));
    await page.goto('/converter');
    await hydrated(page);
    // Give the engine worker time to start and probe capabilities; it must still pull in no codec.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(loaded.filter((u) => /webp_enc|aac/i.test(u))).toEqual([]);
  });
});
