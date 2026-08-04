import { render, screen } from '@testing-library/react';

import Index from './page';

/**
 * The shell is glue code, so this asserts the one thing it is responsible
 * for: that it can consume @helpme/ui across the project boundary and get
 * real, styled components back.
 */
describe('shell index page', () => {
  it('renders components sourced from @helpme/ui', () => {
    render(<Index />);

    expect(
      screen.getByRole('heading', { name: 'Help Me', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add expense' })
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('applies the shared design tokens to library components', () => {
    render(<Index />);

    // bg-primary is declared inside @helpme/ui's button.tsx, never here.
    // Seeing it proves the class actually crossed the library boundary.
    expect(screen.getByRole('button', { name: 'Add expense' })).toHaveClass(
      'bg-primary'
    );
  });
});
