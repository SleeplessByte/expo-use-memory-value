import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItemAsync(key: string): Promise<unknown> {
  const value = await AsyncStorage.getItem(key);
  return value ? JSON.parse(value) : value;
}

export async function setItemAsync<T>(key: string, value: T) {
  const storable = JSON.stringify(value);
  return AsyncStorage.setItem(key, storable);
}

export async function deleteItemAsync(key: string) {
  return AsyncStorage.removeItem(key);
}
