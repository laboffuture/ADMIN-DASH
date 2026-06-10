import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

const projects = [
  { id: 'code-runner', name: 'Code Runner', adminUrl: 'http://10.0.0.5:8080/admin/monitoring' },
  { id: 'protoview', name: 'PROTOVIEW', adminUrl: 'http://10.0.0.5:4000/admin' },
];

describe('Sidebar', () => {
  it('renders each project with its status dot and latency', () => {
    const statuses = {
      'code-runner': { status: 'online', latencyMs: 42 },
      protoview: { status: 'down', latencyMs: null },
    };
    render(
      <Sidebar projects={projects} statuses={statuses} selectedId="code-runner" onSelect={() => {}} onLogout={() => {}} />,
    );
    expect(screen.getByText('Code Runner').closest('button').querySelector('.dot-online')).not.toBeNull();
    expect(screen.getByText('PROTOVIEW').closest('button').querySelector('.dot-down')).not.toBeNull();
    expect(screen.getByText('42ms')).toBeInTheDocument();
  });

  it('shows an unknown dot before the first status arrives', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('Code Runner').closest('button').querySelector('.dot-unknown')).not.toBeNull();
  });

  it('reports the clicked project id', async () => {
    const onSelect = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={onSelect} onLogout={() => {}} />);
    await userEvent.click(screen.getByText('PROTOVIEW'));
    expect(onSelect).toHaveBeenCalledWith('protoview');
  });

  it('marks the selected project', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId="protoview" onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('PROTOVIEW').closest('button').className).toContain('selected');
  });

  it('calls onLogout from the footer button', async () => {
    const onLogout = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
