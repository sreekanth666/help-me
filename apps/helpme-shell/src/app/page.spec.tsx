import { render, screen } from '@testing-library/react';

import { apps } from './apps';
import Home from './page';

describe('landing page', () => {
  it('links to every registered app', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { name: 'Help Me', level: 1 })
    ).toBeInTheDocument();

    for (const app of apps) {
      expect(
        screen.getByRole('link', { name: new RegExp(app.name) })
      ).toHaveAttribute('href', app.href);
    }
  });
});
