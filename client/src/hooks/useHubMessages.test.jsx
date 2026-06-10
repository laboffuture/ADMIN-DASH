import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHubMessages } from './useHubMessages';

const projects = [
  { id: 'protoview', name: 'PROTOVIEW', adminUrl: 'http://10.0.0.5:4000/admin' },
];

function postFrom(origin, data) {
  window.dispatchEvent(new MessageEvent('message', { origin, data }));
}

describe('useHubMessages', () => {
  it('forwards notify messages from registered module origins', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://10.0.0.5:4000', { type: 'notify', text: 'New votes are in' });
    expect(onNotify).toHaveBeenCalledWith('New votes are in', 'http://10.0.0.5:4000');
  });

  it('ignores messages from unknown origins', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://evil.example', { type: 'notify', text: 'hi' });
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('ignores unknown message types and malformed payloads', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://10.0.0.5:4000', { type: 'mystery' });
    postFrom('http://10.0.0.5:4000', { type: 'notify', text: 42 });
    postFrom('http://10.0.0.5:4000', null);
    expect(onNotify).not.toHaveBeenCalled();
  });
});
