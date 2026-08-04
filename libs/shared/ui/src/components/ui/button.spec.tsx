import { render, screen } from '@testing-library/react';

import { Button } from './button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Add expense</Button>);

    expect(
      screen.getByRole('button', { name: 'Add expense' })
    ).toBeInTheDocument();
  });

  it('applies design-system variant classes', () => {
    render(<Button>Save</Button>);

    // Proves the token-based classes reach the DOM. If this ever renders
    // without bg-primary, the shared theme is not wired up.
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('lets a caller override a variant class', () => {
    render(<Button className="bg-muted">Cancel</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-muted');
    expect(button).not.toHaveClass('bg-primary');
  });
});
