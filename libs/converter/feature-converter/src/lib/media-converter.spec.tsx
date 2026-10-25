import type { Capabilities, VideoProbe } from '@helpme/converter-domain';
import { ConverterError, type ConverterClient } from '@helpme/converter-engine';
import { TooltipProvider } from '@helpme/ui/components/ui/tooltip';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MediaConverter } from './media-converter';

const CAPS: Capabilities = {
  webCodecs: true,
  videoEncoders: ['avc', 'vp9'],
  audioEncoders: ['aac', 'opus'],
  aacViaWasm: false,
  nativeWebpEncode: true,
  fileSystemAccess: false,
  deviceClass: 'desktop',
};

const WEBM: VideoProbe = {
  container: 'webm',
  durationSec: 60,
  width: 1280,
  height: 720,
  fps: 30,
  video: { codec: 'vp9', canDecode: true, kbps: 2000 },
  audio: { codec: 'opus', canDecode: true, kbps: 96 },
};

function fakeClient(over: Partial<ConverterClient> = {}, caps: Capabilities = CAPS) {
  const client = {
    capabilities: vi.fn(async () => caps),
    probe: vi.fn(async (file: File) =>
      file.name.endsWith('.webm')
        ? ({ kind: 'video', format: 'webm', probe: WEBM } as const)
        : ({
            kind: 'image',
            format: 'png',
            info: { format: 'png', width: 800, height: 600, animated: false },
          } as const),
    ),
    convert: vi.fn(async () => ({
      blob: new Blob([new Uint8Array(400)], { type: 'image/webp' }),
      bytes: 400,
      mime: 'image/webp',
      ms: 12,
      encoder: 'native' as const,
    })),
    dispose: vi.fn(),
    ...over,
  };
  return client as typeof client & ConverterClient;
}

const png = () => new File([new Uint8Array(1000)], 'photo.png', { type: 'image/png' });
const webm = () => new File([new Uint8Array(5000)], 'clip.webm', { type: 'video/webm' });

function renderApp(client: ConverterClient) {
  return render(
    <TooltipProvider>
      <MediaConverter client={client} />
    </TooltipProvider>,
  );
}

const addFiles = (...files: File[]) =>
  fireEvent.change(screen.getByTestId('file-input'), { target: { files } });

beforeEach(() => localStorage.clear());

describe('MediaConverter', () => {
  it('invites a drop and says files stay on the device', () => {
    renderApp(fakeClient());
    expect(screen.getByRole('heading', { name: 'Media Converter', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/never leave your device/i)).toBeInTheDocument();
  });

  it('lists an added image with its size and a WebP default', async () => {
    renderApp(fakeClient());
    addFiles(png());
    const item = await screen.findByTestId('queue-item');
    expect(within(item).getByText('photo.png')).toBeInTheDocument();
    await waitFor(() => expect(within(item).getByText(/800×600/)).toBeInTheDocument());
    expect(within(item).getByLabelText('Convert photo.png to')).toHaveValue('webp');
  });

  it('converts and shows the output size with the saving', async () => {
    const client = fakeClient();
    renderApp(client);
    addFiles(png());
    await screen.findByText(/800×600/);
    fireEvent.click(screen.getByRole('button', { name: 'Convert all' }));
    expect(await screen.findByTestId('result-size')).toHaveTextContent('400 B');
    expect(screen.getByTestId('savings')).toHaveTextContent('−60%');
    expect(screen.getByRole('button', { name: /download photo\.webp/i })).toBeInTheDocument();
  });

  it('flags a result that came out larger instead of hiding it', async () => {
    const client = fakeClient({
      convert: vi.fn(async () => ({ blob: new Blob([new Uint8Array(2000)]), bytes: 2000, mime: 'image/webp', ms: 3, encoder: 'native' as const })),
    });
    renderApp(client);
    addFiles(png());
    await screen.findByText(/800×600/);
    fireEvent.click(screen.getByRole('button', { name: 'Convert all' }));
    expect(await screen.findByTestId('savings')).toHaveTextContent('+100% larger');
  });

  it('sends the chosen target format to the engine', async () => {
    const client = fakeClient();
    renderApp(client);
    addFiles(png());
    await screen.findByText(/800×600/);
    fireEvent.change(screen.getByLabelText('Convert photo.png to'), { target: { value: 'jpeg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Convert all' }));
    await screen.findByTestId('result-size');
    expect(client.convert.mock.calls[0][0].job).toMatchObject({ kind: 'image', options: { format: 'jpeg' } });
  });

  it('applies the Web small image preset to the job', async () => {
    const client = fakeClient();
    renderApp(client);
    const presets = within(screen.getByRole('group', { name: 'Image preset' }));
    fireEvent.click(presets.getByRole('button', { name: 'Web small' }));
    expect(presets.getByRole('button', { name: 'Web small' })).toHaveAttribute('aria-pressed', 'true');
    addFiles(png());
    await screen.findByText(/800×600/);
    fireEvent.click(screen.getByRole('button', { name: 'Convert all' }));
    await screen.findByTestId('result-size');
    expect(client.convert.mock.calls[0][0].job).toMatchObject({
      options: { quality: 75, maxDimension: 1920 },
    });
  });

  it('remembers settings across visits', () => {
    const first = renderApp(fakeClient());
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Image preset' })).getByRole('button', { name: 'Max quality' }),
    );
    first.unmount();
    renderApp(fakeClient());
    return waitFor(() =>
      expect(
        within(screen.getByRole('group', { name: 'Image preset' })).getByRole('button', { name: 'Max quality' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('reports an unsupported file with the reason', async () => {
    const client = fakeClient({
      probe: vi.fn(async () => {
        throw new ConverterError('unsupported-input', 'Unsupported file. Use a PNG, JPEG, WebP, MP4 or WebM file.');
      }),
    });
    renderApp(client);
    addFiles(new File(['x'], 'notes.txt'));
    expect(await screen.findByText(/Unsupported file/)).toBeInTheDocument();
  });

  it('shows a conversion error with a retry', async () => {
    const client = fakeClient({
      convert: vi.fn(async () => {
        throw new ConverterError('out-of-memory', 'The browser ran out of memory. Try a smaller file.');
      }),
    });
    renderApp(client);
    addFiles(png());
    await screen.findByText(/800×600/);
    fireEvent.click(screen.getByRole('button', { name: 'Convert all' }));
    expect(await screen.findByText(/ran out of memory/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry photo\.png/i })).toBeInTheDocument();
  });
});

describe('MediaConverter: oversize images', () => {
  it('refuses an image beyond the pixel budget up front, with advice', async () => {
    const client = fakeClient({
      probe: vi.fn(async () => ({
        kind: 'image' as const,
        format: 'png' as const,
        info: { format: 'png' as const, width: 12000, height: 12000, animated: false },
      })),
    });
    renderApp(client);
    addFiles(png());
    expect(await screen.findByText(/too large to convert safely/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert all' })).toBeDisabled();
  });
});

describe('MediaConverter: video', () => {
  it('shows a WebM heading to MP4 as a re-encode with a size estimate', async () => {
    renderApp(fakeClient());
    addFiles(webm());
    const item = await screen.findByTestId('queue-item');
    await waitFor(() => expect(within(item).getByText('Re-encoded')).toBeInTheDocument());
    expect(within(item).getByLabelText('Convert clip.webm to')).toHaveValue('mp4');
    expect(within(item).getByTestId('estimate')).toHaveTextContent(/^≈/);
  });

  it('offers fast copy with a compatibility warning', async () => {
    renderApp(fakeClient());
    addFiles(webm());
    await screen.findByText('Re-encoded');
    fireEvent.click(screen.getByRole('switch', { name: /keep original codecs/i }));
    expect(await screen.findByText('Fast copy')).toBeInTheDocument();
    expect(screen.getByText(/some players \(such as QuickTime\) may not open it/)).toBeInTheDocument();
  });

  it('blocks a conversion this browser cannot do and says why', async () => {
    renderApp(fakeClient({}, { ...CAPS, videoEncoders: [] }));
    addFiles(webm());
    expect(await screen.findByText(/can't encode H\.264/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert all' })).toBeDisabled();
  });
});
