import localForage from 'localforage';

const globals: { current: LocalForage } = { current: localForage };

export function setLocalForageInstance(instance: LocalForage) {
  globals.current = instance;
}

export async function getItemAsync(key: string): Promise<unknown> {
  return await globals.current.getItem(key);
}

export async function setItemAsync<T>(key: string, value: T) {
  return globals.current.setItem(key, value);
}

export async function deleteItemAsync(key: string) {
  return globals.current.removeItem(key);
}
