import {
  getItemAsync as getSecureItemAsync,
  setItemAsync as setSecureItemAsync,
  deleteItemAsync as deleteSecureItemAsync,
} from 'expo-secure-store';
import {
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';
import isEqual from 'react-fast-compare';
import { AsyncStorage } from 'react-native';

const getItemAsync = AsyncStorage.getItem;
const setItemAsync = AsyncStorage.setItem;
const deleteItemAsync = AsyncStorage.removeItem;

export type Serializable =
  | boolean
  | number
  | string
  | null
  | SerializableArray
  | SerializableMap;
interface SerializableMap {
  [key: string]: Serializable;
}
interface SerializableArray extends Array<Serializable> {}

export type Unsubscribe = () => void;
export type Listener<T extends Serializable> = (
  value: Readonly<AnyValue<T>>
) => void;

export type UndeterminedValue = undefined;
export type NoValue = null;
export type Update<T extends Serializable> = Dispatch<
  SetStateAction<AnyValue<T> | undefined>
>;
export type AnyValue<T extends Serializable> = T | UndeterminedValue;

export interface AnyMemoryValue<T extends Serializable> {
  current: AnyValue<T>;
  subscribe(listener: Listener<T>, emit?: boolean): Unsubscribe;
  unsubscribe(listener: Listener<T>): void;
  emit(value: AnyValue<T>, store?: boolean, newOnly?: boolean): void;
}

export class MemoryValue<T extends Serializable> implements AnyMemoryValue<T> {
  private listeners: Listener<T>[];
  private value: T | undefined;

  constructor(initial?: Readonly<T>) {
    this.listeners = [];
    this.value = initial;
  }

  get current(): T | undefined {
    return this.value;
  }

  subscribe(listener: Listener<T>, emit: boolean = true): Unsubscribe {
    if (this.value !== undefined && emit) {
      listener(this.value);
    }

    this.listeners.push(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: Listener<T>) {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  emit(value: T | undefined, _store: boolean = false, newOnly: boolean = true) {
    if (newOnly && isEqual(this.value, value)) {
      return;
    }

    this.value = value;
    this.listeners.forEach((listener) => listener(value));
  }
}

export class SecureStoredMemoryValue<T extends Serializable>
  implements AnyMemoryValue<T | NoValue> {
  private value: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    hydrate: boolean = true,
    initial?: Readonly<T>
  ) {
    this.value = new MemoryValue<T | NoValue>(initial);

    this.storageKey = storageKey;

    if (hydrate) {
      this.read();
    }
  }

  get current(): T | null | undefined {
    return this.value.current;
  }

  subscribe(listener: Listener<T | NoValue>, emit: boolean = true) {
    return this.value.subscribe(listener, emit);
  }

  unsubscribe(listener: Listener<T | NoValue>) {
    return this.value.unsubscribe(listener);
  }

  emit(
    value: AnyValue<T> | NoValue,
    store: boolean = true,
    newOnly: boolean = true
  ) {
    if (newOnly && isEqual(value, this.current)) {
      return;
    }

    if (store) {
      this.write(value);
    }

    this.value.emit(value, false, false);
  }

  private read() {
    getSecureItemAsync(this.storageKey).then(
      (value: any) => {
        if (value) {
          const stored = JSON.parse(value);
          this.emit(stored, false);
        } else {
          this.emit(null, false);
        }
      },
      () => {}
    );
  }

  private write(value: AnyValue<T> | NoValue) {
    if (value === undefined) {
      return this.clear();
    }

    const stored = JSON.stringify(value);
    setSecureItemAsync(this.storageKey, stored).catch((err) => {
      __DEV__ && console.error(err);
    });
  }

  private clear() {
    deleteSecureItemAsync(this.storageKey).catch(() => {});
  }
}

export class StoredMemoryValue<T extends Serializable>
  implements AnyMemoryValue<T | NoValue> {
  private value: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    hydrate: boolean = true,
    initial?: Readonly<T>
  ) {
    this.value = new MemoryValue<T | NoValue>(initial);

    this.storageKey = storageKey;

    if (hydrate) {
      this.read();
    }
  }

  get current(): T | null | undefined {
    return this.value.current;
  }

  subscribe(listener: Listener<T | NoValue>, emit: boolean = true) {
    return this.value.subscribe(listener, emit);
  }

  unsubscribe(listener: Listener<T | NoValue>) {
    return this.value.unsubscribe(listener);
  }

  emit(
    value: T | null | undefined,
    store: boolean = true,
    newOnly: boolean = true
  ) {
    if (newOnly && isEqual(value, this.current)) {
      return;
    }

    if (store) {
      this.write(value);
    }

    this.value.emit(value, false, false);
  }

  private read() {
    getItemAsync(this.storageKey).then(
      (value: any) => {
        if (value) {
          const stored = JSON.parse(value);
          this.emit(stored, false);
        } else {
          this.emit(null, false);
        }
      },
      () => {}
    );
  }

  private write(value: T | null | undefined) {
    if (value === undefined) {
      return this.clear();
    }

    const stored = JSON.stringify(value);
    setItemAsync(this.storageKey, stored).catch(() => {});
  }

  private clear() {
    deleteItemAsync(this.storageKey).catch(() => {});
  }
}

export function useMemoryValue<T extends Serializable>(
  value: AnyMemoryValue<T>
): Readonly<AnyValue<T>> {
  return useMutableMemoryValue(value)[0];
}

export function useMutableMemoryValue<T extends Serializable>(
  value: AnyMemoryValue<T>
): [Readonly<AnyValue<T>>, Update<T>] {
  const [state, setState] = useState<AnyValue<T>>(value.current);

  const update = useCallback(
    (nextValue: AnyValue<T> | ((prev: AnyValue<T>) => AnyValue<T>)) => {
      if (typeof nextValue === 'function') {
        value.emit(nextValue(value.current));
      } else {
        value.emit(nextValue);
      }
    },
    [value]
  );

  useEffect(() => {
    return value.subscribe(setState);
  }, [value, setState]);

  return [state, update];
}
