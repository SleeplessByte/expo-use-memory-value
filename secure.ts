import {
  getItemAsync as nativeGetItemAsync,
  setItemAsync as nativeSetItemAsync,
  deleteItemAsync as nativeDeleteItemAsync,
} from 'expo-secure-store';

export const getItemAsync = (key: string) =>
  nativeGetItemAsync(key).then((value) => (value ? JSON.parse(value) : value));

export const setItemAsync = (key: string, value: unknown) => {
  const storable = JSON.stringify(value);
  return nativeSetItemAsync(key, storable);
};

export const deleteItemAsync = (key: string) => {
  return nativeDeleteItemAsync(key);
};
