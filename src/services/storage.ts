import { MMKV } from 'react-native-mmkv';

/**
 * App-wide MMKV instance. We keep a single store for simplicity. If you ever
 * need encrypted storage (e.g. for tokens), spin up a second instance here.
 */
export const storage = new MMKV({
  id: 'scorepad-default',
});

export const storageAdapter = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};
