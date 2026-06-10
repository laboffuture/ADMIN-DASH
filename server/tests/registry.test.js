import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRegistry } from '../registry.js';

const VALID = [
  { id: 'a', name: 'Project A', adminUrl: 'http://10.0.0.5:4000/admin' },
];

let file;

beforeEach(() => {
  file = path.join(os.tmpdir(), `admlink-registry-${Date.now()}-${Math.random()}.json`);
});

afterEach(() => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
});

describe('createRegistry', () => {
  it('loads a valid projects file', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    expect(registry.load()).toEqual(VALID);
  });

  it('keeps the last good list when the file becomes invalid JSON', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    registry.load();
    fs.writeFileSync(file, '{ this is not json');
    expect(registry.load()).toEqual(VALID);
  });

  it('keeps the last good list when entries are missing required fields', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    registry.load();
    fs.writeFileSync(file, JSON.stringify([{ name: 'no id' }]));
    expect(registry.load()).toEqual(VALID);
  });

  it('accepts entries without adminUrl (pending modules)', () => {
    const pending = [{ id: 'qc-agent', name: 'QC AGENT' }];
    fs.writeFileSync(file, JSON.stringify(pending));
    const registry = createRegistry(file);
    expect(registry.load()).toEqual(pending);
  });

  it('returns an empty list when the file was never valid', () => {
    const registry = createRegistry(file); // file does not exist
    expect(registry.load()).toEqual([]);
  });
});
