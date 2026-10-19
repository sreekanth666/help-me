import { fireEvent, render, screen } from '@testing-library/react';

import { TooltipProvider } from '@helpme/ui/components/ui/tooltip';

import { KsebCalculator } from './kseb-calculator';

const renderCalculator = () =>
  render(
    <TooltipProvider>
      <KsebCalculator />
    </TooltipProvider>,
  );

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('KsebCalculator', () => {
  beforeEach(() => window.localStorage.clear());

  it('prices the Aug 2025 reference bill at ₹486', () => {
    renderCalculator();
    type('Month', '2025-08');
    type('Previous reading', '1000');
    type('Current reading', '1104');

    expect(screen.getByTestId('bill-total')).toHaveTextContent('₹486');
    expect(screen.getByText('Exact')).toBeInTheDocument();
    expect(screen.getByText('Actual reading')).toBeInTheDocument();
    expect(screen.getByText('104 units used')).toBeInTheDocument();
  });

  it('asks for readings before showing a total', () => {
    renderCalculator();
    expect(screen.getByTestId('bill-total')).toHaveTextContent('₹—');
    expect(screen.getByText('Enter both meter readings.')).toBeInTheDocument();
  });

  it('bills a door-locked meter on assessed units', () => {
    renderCalculator();
    type('Month', '2025-10');
    type('Meter status', 'door_lock');
    type('Or monthly average', '65');

    expect(screen.getByText('Assessed')).toBeInTheDocument();
    expect(screen.getByTestId('bill-total')).toHaveTextContent('₹599');
  });

  it('remembers inputs between visits', () => {
    const { unmount } = renderCalculator();
    type('Previous reading', '1234');
    unmount();

    renderCalculator();
    expect(screen.getByLabelText('Previous reading')).toHaveValue(1234);
  });
});
