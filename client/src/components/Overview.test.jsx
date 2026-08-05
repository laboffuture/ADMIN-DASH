import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Overview } from './Overview';

const projects = [
  { id: 'coderunner', name: 'CODERUNNER', description: 'Python compiler', adminUrl: 'https://web.up.railway.app/admin/monitoring', accent: '#76B900' },
  { id: 'qc-agent', name: 'QC AGENT', description: 'AI quality control' },
];

const statuses = {
  coderunner: { status: 'online', latencyMs: 88 },
  'qc-agent': { status: 'pending', latencyMs: null },
};

describe('Overview', () => {
  it('renders a card per module with name and description', () => {
    render(<Overview projects={projects} statuses={statuses} onSelect={() => {}} />);
    expect(screen.getByText('CODERUNNER')).toBeInTheDocument();
    expect(screen.getByText('Python compiler')).toBeInTheDocument();
    expect(screen.getByText('QC AGENT')).toBeInTheDocument();
  });

  it('shows the status label for connected modules', () => {
    render(<Overview projects={projects} statuses={statuses} onSelect={() => {}} />);
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
  });

  it('does not show response latency', () => {
    render(<Overview projects={projects} statuses={statuses} onSelect={() => {}} />);
    expect(screen.queryByText('88ms')).toBeNull();
  });

  it('marks unconnected modules as placeholders', () => {
    render(<Overview projects={projects} statuses={statuses} onSelect={() => {}} />);
    expect(screen.getByText('NOT CONNECTED')).toBeInTheDocument();
  });

  it('summarises how many modules are online', () => {
    render(<Overview projects={projects} statuses={statuses} onSelect={() => {}} />);
    expect(screen.getByText(/1 of 2 online/i)).toBeInTheDocument();
  });

  it('selects a module when its card is clicked', async () => {
    const onSelect = vi.fn();
    render(<Overview projects={projects} statuses={statuses} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('CODERUNNER'));
    expect(onSelect).toHaveBeenCalledWith('coderunner');
  });
});
