import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from './Topbar';

describe('Topbar', () => {
  it('shows today’s date', () => {
    render(<Topbar />);
    const today = new Date()
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase();
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it('shows no FX rate chips', () => {
    render(<Topbar />);
    expect(screen.queryByText(/AED/)).toBeNull();
    expect(screen.queryByText(/USD/)).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
  });
});
