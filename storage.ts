import AsyncStorage from '@react-native-async-storage/async-storage';

export const getItemAsync = (key: string) =>
  AsyncStorage.getItem(key).then((value) =>
    value ? JSON.parse(value) : value
  );

export const setItemAsync = (key: string, value: unknown) => {
  const storable = JSON.stringify(value);
  return AsyncStorage.setItem(key, storable);
};

export const deleteItemAsync = AsyncStorage.removeItem;
