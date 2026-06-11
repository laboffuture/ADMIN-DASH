import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from './Topbar';

const rates = { aedInr: 23.314, usdInr: 85.612, fetchedAt: '2026-06-11T08:00:00.000Z' };

describe('Topbar', () => {
  it('shows AED→INR and USD→INR chips from the hub rates', () => {
    render(<Topbar rates={rates} />);
    expect(screen.getByText('1 AED')).toBeInTheDocument();
    expect(screen.getByText('₹ 23.31')).toBeInTheDocument();
    expect(screen.getByText('1 USD')).toBeInTheDocument();
    expect(screen.getByText('₹ 85.61')).toBeInTheDocument();
  });

  it('renders no rate chips while rates are unavailable', () => {
    render(<Topbar rates={null} />);
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/USD/)).toBeNull();
  });

  it('shows today’s date', () => {
    render(<Topbar rates={null} />);
    const today = new Date()
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase();
    expect(screen.getByText(today)).toBeInTheDocument();
  });
});
