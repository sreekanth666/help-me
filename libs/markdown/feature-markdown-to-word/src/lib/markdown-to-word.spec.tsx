import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { MarkdownToWord } from './markdown-to-word';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

class ClipboardItemStub {
  constructor(public items: Record<string, Blob>) {}
}

const write = vi.fn();

// jsdom's Blob has no text().
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

beforeEach(() => {
  write.mockReset().mockResolvedValue(undefined);
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.stubGlobal('ClipboardItem', ClipboardItemStub);
  Object.defineProperty(navigator, 'clipboard', {
    value: { write },
    configurable: true,
  });
});

afterEach(() => vi.unstubAllGlobals());

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText('Markdown'), { target: { value } });

describe('MarkdownToWord', () => {
  it('starts empty with Copy and Clear disabled', () => {
    render(<MarkdownToWord />);
    expect(
      screen.getByRole('button', { name: /Copy for Word/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeDisabled();
    expect(
      screen.getByText('The formatted result appears here.'),
    ).toBeInTheDocument();
  });

  it('previews the pasted Markdown as formatted HTML', () => {
    render(<MarkdownToWord />);
    type('# Title\n\n- one\n- two');
    const preview = screen.getByTestId('preview');
    expect(preview.querySelector('h1')).toHaveTextContent('Title');
    expect(preview.querySelectorAll('li')).toHaveLength(2);
  });

  it('writes text/html and text/plain to the clipboard on Copy', async () => {
    render(<MarkdownToWord />);
    type('# Title');
    fireEvent.click(screen.getByRole('button', { name: /Copy for Word/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const item = write.mock.calls[0][0][0] as ClipboardItemStub;
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain']);
    expect(await readBlob(item.items['text/html'])).toMatch(
      /<h1 [^>]*>Title<\/h1>/,
    );
    expect(await readBlob(item.items['text/plain'])).toBe('# Title');
  });

  it('reports a failed copy', async () => {
    write.mockRejectedValue(new Error('denied'));
    render(<MarkdownToWord />);
    type('hi');
    fireEvent.click(screen.getByRole('button', { name: /Copy for Word/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('falls back to a selection copy when ClipboardItem is unavailable', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    render(<MarkdownToWord />);
    type('# Title');
    fireEvent.click(screen.getByRole('button', { name: /Copy for Word/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(write).not.toHaveBeenCalled();
  });

  it('clears the input', () => {
    render(<MarkdownToWord />);
    type('# Title');
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    expect(screen.getByLabelText('Markdown')).toHaveValue('');
  });

  it('pastes from the clipboard when it can be read', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write,
        readText: vi.fn().mockResolvedValue('## From clipboard'),
      },
      configurable: true,
    });
    render(<MarkdownToWord />);
    fireEvent.click(
      screen.getByRole('button', { name: /Paste from clipboard/ }),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('preview').querySelector('h2'),
      ).toHaveTextContent('From clipboard'),
    );
  });
});
