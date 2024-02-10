import {
  getItemAsync as nativeGetItemAsync,
  setItemAsync as nativeSetItemAsync,
  deleteItemAsync as nativeDeleteItemAsync,
} from 'expo-secure-store';

export async function getItemAsync(key: string): Promise<unknown> {
  const value = await nativeGetItemAsync(key);
  return value ? JSON.parse(value) : value;
}

export async function setItemAsync<T>(key: string, value: T) {
  const storable = JSON.stringify(value);
  return nativeSetItemAsync(key, storable);
}

export async function deleteItemAsync(key: string) {
  return nativeDeleteItemAsync(key);
}
