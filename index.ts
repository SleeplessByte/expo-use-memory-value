import mitt from 'mitt';
import type { Dispatch, SetStateAction } from 'react';
import { useSyncExternalStore } from 'react';
import isEqual from 'react-fast-compare';

import {
  deleteItemAsync as deleteSecureItemAsync,
  getItemAsync as getSecureItemAsync,
  setItemAsync as setSecureItemAsync,
} from './secure';
import { deleteItemAsync, getItemAsync, setItemAsync } from './storage';

const emitter = mitt<{ emit: EmitEvent }>();

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
export type EmitEvent<T extends Serializable = Serializable> = Readonly<{
  key: string;
  value: Readonly<AnyValue<T>>;
  oldValue: Readonly<AnyValue<T>>;
}>;

export interface AnyMemoryValue<T extends Serializable> {
  getSnapshot(): AnyValue<T>;
  subscribe(listener: Listener<T>): Unsubscribe;
  emit(nextValue: AnyValue<T>): AnyValue<T>;
}

export class MemoryValue<T extends Serializable> implements AnyMemoryValue<T> {
  private value: T | undefined;
  private readonly key: string;

  constructor(initial?: Readonly<T>) {
    this.value = initial;
    this.key = `memory-value-${Math.random().toString(36)}`;
  }

  getSnapshot(): AnyValue<T> {
    return this.value;
  }

  subscribe(listener: Listener<T>): Unsubscribe {
    const onEmit = (event: EmitEvent) => {
      if (event.key === this.key) {
        listener(event.value as Readonly<AnyValue<T>>);
      }
    };

    emitter.on('emit', onEmit);
    return () => {
      emitter.off('emit', onEmit);
    };
  }

  emit(nextValue: AnyValue<T> | ((prev: AnyValue<T>) => AnyValue<T>)) {
    if (typeof nextValue === 'function') {
      nextValue = nextValue(this.value);
    }

    if (isEqual(this.value, nextValue)) {
      return nextValue;
    }

    this.value = nextValue;

    emitter.emit('emit', {
      key: this.key,
      value: nextValue,
      oldValue: this.value,
    } satisfies EmitEvent<T>);

    return nextValue;
  }
}

export class SecureStoredMemoryValue<T extends Serializable>
  implements AnyMemoryValue<T | NoValue>
{
  private value: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    initial?: Readonly<T>
  ) {
    this.value = new MemoryValue<T | NoValue>(initial);

    // Hydrate from storage
    this.hydrate()
      .catch(() => {})
      .then(() => {
        // Subscribe to updates after hydration
        this.subscribe(this.write);
      });
  }

  getSnapshot(): AnyValue<T | NoValue> {
    return this.value.getSnapshot();
  }

  subscribe(listener: Listener<T | NoValue>) {
    return this.value.subscribe(listener);
  }

  emit(
    nextValue:
      | AnyValue<T | NoValue>
      | ((prev: AnyValue<T | NoValue>) => AnyValue<T | NoValue>)
  ) {
    const prevValue = this.getSnapshot();

    if (typeof nextValue === 'function') {
      nextValue = nextValue(prevValue);
    }

    if (isEqual(nextValue, prevValue)) {
      return nextValue;
    }

    this.write(nextValue).catch(() => {});
    return this.value.emit(nextValue);
  }

  async hydrate() {
    const value = await getSecureItemAsync(this.storageKey);

    if (value === undefined || value === null) {
      this.value.emit(null);
    } else {
      this.value.emit(value as T);
    }
  }

  private async write(value: AnyValue<T> | NoValue) {
    if (value === undefined) {
      return deleteSecureItemAsync(this.storageKey).catch(warn);
    }

    return setSecureItemAsync(this.storageKey, value).catch(warn);
  }
}

export class StoredMemoryValue<T extends Serializable>
  implements AnyMemoryValue<T | NoValue>
{
  private value: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    initial?: Readonly<T>
  ) {
    this.value = new MemoryValue<T | NoValue>(initial);

    // Hydrate from storage
    this.hydrate()
      .catch(() => {})
      .then(() => {
        // Subscribe to updates after hydration
        this.subscribe(this.write);
      });
  }

  getSnapshot(): AnyValue<T | NoValue> {
    return this.value.getSnapshot();
  }

  subscribe(listener: Listener<T | NoValue>) {
    return this.value.subscribe(listener);
  }

  emit(
    nextValue:
      | AnyValue<T | NoValue>
      | ((prev: AnyValue<T | NoValue>) => AnyValue<T | NoValue>)
  ) {
    const prevValue = this.getSnapshot();

    if (typeof nextValue === 'function') {
      nextValue = nextValue(prevValue);
    }

    if (isEqual(nextValue, prevValue)) {
      return nextValue;
    }

    this.write(nextValue).catch(() => {});
    return this.value.emit(nextValue);
  }

  async hydrate() {
    const value = await getItemAsync(this.storageKey);

    if (value === undefined || value === null) {
      this.value.emit(null);
    } else {
      this.value.emit(value as T);
    }
  }

  private async write(value: AnyValue<T> | NoValue) {
    if (value === undefined) {
      return deleteItemAsync(this.storageKey).catch(warn);
    }

    return setItemAsync(this.storageKey, value).catch(warn);
  }
}

export function useGlobalValue<T extends Serializable = Serializable>(
  value: AnyMemoryValue<T | NoValue>
): [
  AnyValue<T | NoValue>,
  Dispatch<SetStateAction<T | NoValue | UndeterminedValue>>,
] {
  const snapshot = useSyncExternalStore(value.subscribe, value.getSnapshot);
  return [
    snapshot,
    value.emit as Dispatch<SetStateAction<T | NoValue | UndeterminedValue>>,
  ];
}

export function useGlobalValueAsync<T extends Serializable = Serializable>(
  value: AnyMemoryValue<T | NoValue>
): [
  [boolean, AnyValue<T | NoValue>],
  Dispatch<SetStateAction<T | NoValue | UndeterminedValue>>,
] {
  const [state, setState] = useGlobalValue<T>(value);
  return [[state === undefined, state], setState];
}
