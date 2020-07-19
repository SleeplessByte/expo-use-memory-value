import localForage from 'localforage';

const globals: { current: LocalForage } = { current: localForage };

export function setLocalForageInstance(instance: LocalForage) {
  globals.current = instance;
}

export const getItemAsync = (key: string) => globals.current.getItem(key);
export const setItemAsync = (key: string, value: unknown) =>
  globals.current.setItem(key, value);
export const deleteItemAsync = (key: string) => globals.current.removeItem(key);
