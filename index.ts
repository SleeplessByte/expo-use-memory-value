import {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
  useLayoutEffect,
} from 'react';
import isEqual from 'react-fast-compare';

import {
  deleteItemAsync as deleteSecureItemAsync,
  getItemAsync as getSecureItemAsync,
  setItemAsync as setSecureItemAsync,
} from './secure';
import { deleteItemAsync, getItemAsync, setItemAsync } from './storage';

let warningDisabled = false;
export function disableWarnings() {
  warningDisabled = true;
}

function warn(...args: any[]) {
  if (warningDisabled) {
    return;
  }

  console.warn('[expo-use-memory-value]', ...args);
}

export type Serializable =
  | boolean
  | number
  | string
  | null
  | SerializableArray
  | ReadonlySerializableArray
  | SerializableMap;

interface SerializableMap {
  [key: string]: Serializable | undefined;
}
interface SerializableArray extends Array<Serializable | undefined> {}
interface ReadonlySerializableArray
  extends ReadonlyArray<Serializable | undefined> {}

export type Unsubscribe = () => void;
export type Listener<T extends Serializable> = (
  value: Readonly<AnyValue<T>>
) => Promise<unknown> | void;

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
  emit(
    value: AnyValue<T>,
    store?: boolean,
    newOnly?: boolean
  ): Promise<AnyValue<T>>;
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

  async emit(
    value: T | undefined,
    _store: boolean = false,
    newOnly: boolean = true
  ) {
    if (newOnly && isEqual(this.value, value)) {
      return value;
    }

    this.value = value;
    await Promise.all(this.listeners.map(async (listener) => listener(value)));
    return value;
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
      this.hydrate();
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

  async emit(
    value: AnyValue<T> | NoValue,
    store: boolean = true,
    newOnly: boolean = true
  ) {
    if (newOnly && isEqual(value, this.current)) {
      return value;
    }

    if (store) {
      await this.write(value);
    }

    return this.value.emit(value, false, false);
  }

  async hydrate() {
    return getSecureItemAsync(this.storageKey).then(
      (value: any) => {
        if (value) {
          return this.emit(value, false);
        } else {
          return this.emit(null, false);
        }
      },
      () => {
        return this.value;
      }
    );
  }

  private async write(value: AnyValue<T> | NoValue) {
    if (value === undefined) {
      return this.clear();
    }

    return setSecureItemAsync(this.storageKey, value).catch(warn);
  }

  private async clear() {
    return deleteSecureItemAsync(this.storageKey).catch(warn);
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
      this.hydrate();
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

  async emit(
    value: T | null | undefined,
    store: boolean = true,
    newOnly: boolean = true
  ): Promise<AnyValue<T> | null> {
    if (newOnly && isEqual(value, this.current)) {
      return value;
    }

    if (store) {
      await this.write(value);
    }

    return this.value.emit(value, false, false);
  }

  async hydrate() {
    return getItemAsync(this.storageKey).then(
      (value: any) => {
        if (value) {
          return this.emit(value, false);
        } else {
          return this.emit(null, false);
        }
      },
      () => {
        return this.value;
      }
    );
  }

  private async write(value: T | null | undefined) {
    if (value === undefined) {
      return this.clear();
    }

    return setItemAsync(this.storageKey, value).catch(warn);
  }

  private async clear() {
    return deleteItemAsync(this.storageKey).catch(warn);
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
      if (nextValue instanceof Function || typeof nextValue === 'function') {
        value.emit(nextValue(value.current));
      } else {
        value.emit(nextValue);
      }
    },
    [value]
  );

  useLayoutEffect(() => {
    return value.subscribe(setState);
  }, [value, setState]);

  return [state, update];
}
