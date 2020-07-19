import SecureStorage from 'expo-secure-store';

export const getItemAsync = (key: string) =>
  SecureStorage.getItemAsync(key).then((value) =>
    value ? JSON.parse(value) : value
  );

export const setItemAsync = (key: string, value: unknown) => {
  const storable = JSON.stringify(value);
  return SecureStorage.setItemAsync(key, storable);
};

export const deleteItemAsync = SecureStorage.deleteItemAsync;
