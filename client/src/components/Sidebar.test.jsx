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

  it('shows a pending dot for modules that are not connected yet', () => {
    const pendingProjects = [{ id: 'qc-agent', name: 'QC AGENT' }];
    const statuses = { 'qc-agent': { status: 'pending', latencyMs: null } };
    render(<Sidebar projects={pendingProjects} statuses={statuses} selectedId={null} onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('QC AGENT').closest('button').querySelector('.dot-pending')).not.toBeNull();
  });

  it('offers no way to add a module', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.queryByText(/add a project/i)).toBeNull();
    expect(screen.queryByText(/projects\.json/i)).toBeNull();
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

  it('returns to the overview via the Overview item', async () => {
    const onSelect = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId="protoview" onSelect={onSelect} onLogout={() => {}} />);
    await userEvent.click(screen.getByText('Overview'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks Overview active when no project is selected', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('Overview').closest('button').className).toContain('selected');
  });

  it('calls onLogout from the footer button', async () => {
    const onLogout = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
