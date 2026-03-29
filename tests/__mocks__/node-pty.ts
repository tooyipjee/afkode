import { vi } from 'vitest';

const _instances: any[] = [];

export const spawn = vi.fn((..._args: any[]) => {
  const _dataCallbacks: Function[] = [];
  const _exitCallbacks: Function[] = [];
  const instance = {
    onData: vi.fn((cb: Function) => { _dataCallbacks.push(cb); }),
    onExit: vi.fn((cb: Function) => { _exitCallbacks.push(cb); }),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345 + _instances.length,
    _triggerData: (data: string) => _dataCallbacks.forEach(cb => cb(data)),
    _triggerExit: (info: { exitCode: number }) => _exitCallbacks.forEach(cb => cb(info)),
  };
  _instances.push(instance);
  return instance;
});

export function getSpawnedInstances(): any[] {
  return _instances;
}

export function clearSpawnedInstances(): void {
  _instances.length = 0;
}
