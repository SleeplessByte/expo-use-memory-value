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
  emit(
    nextValue: AnyValue<T> | ((prev: AnyValue<T>) => AnyValue<T>)
  ): AnyValue<T>;
}

export class MemoryValue<T extends Serializable> implements AnyMemoryValue<T> {
  private value: T | undefined;
  private readonly key: string;

  constructor(initial?: Readonly<T>) {
    this.value = initial;
    this.key = `memory-value-${Math.random().toString(36)}`;

    this.getSnapshot = this.getSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.emit = this.emit.bind(this);
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
    } as EmitEvent<T>);

    return nextValue;
  }
}

export class SecureStoredMemoryValue<T extends Serializable>
  implements AnyMemoryValue<T | NoValue>
{
  private memoryValue: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    initial?: Readonly<T>
  ) {
    this.memoryValue = new MemoryValue<T | NoValue>(initial);

    this.getSnapshot = this.getSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.emit = this.emit.bind(this);
    this.write = this.write.bind(this);

    // Hydrate from storage
    this.hydrate(initial)
      .catch(() => {})
      .then(() => {
        // Subscribe to updates after hydration
        this.subscribe(this.write);
      });
  }

  getSnapshot(): AnyValue<T | NoValue> {
    return this.memoryValue.getSnapshot();
  }

  subscribe(listener: Listener<T | NoValue>) {
    return this.memoryValue.subscribe(listener);
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
    return this.memoryValue.emit(nextValue);
  }

  async hydrate(initial?: Readonly<T>) {
    const value = await getSecureItemAsync(this.storageKey);

    if (value === undefined || value === null) {
      if (initial === undefined) {
        this.memoryValue.emit(null);
      } else {
        this.memoryValue.emit(initial);
        this.write(initial);
      }
    } else {
      this.memoryValue.emit(value as T);
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
  private memoryValue: MemoryValue<T | NoValue>;

  constructor(
    private storageKey: string,
    initial?: Readonly<T>
  ) {
    this.memoryValue = new MemoryValue<T | NoValue>(initial);

    this.getSnapshot = this.getSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.emit = this.emit.bind(this);
    this.write = this.write.bind(this);

    // Hydrate from storage
    this.hydrate(initial)
      .catch(() => {})
      .then(() => {
        // Subscribe to updates after hydration
        this.subscribe(this.write);
      });
  }

  getSnapshot(): AnyValue<T | NoValue> {
    return this.memoryValue.getSnapshot();
  }

  subscribe(listener: Listener<T | NoValue>) {
    return this.memoryValue.subscribe(listener);
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
    return this.memoryValue.emit(nextValue);
  }

  async hydrate(initial?: Readonly<T>) {
    const value = await getItemAsync(this.storageKey);

    if (value === undefined || value === null) {
      if (initial === undefined) {
        this.memoryValue.emit(null);
      } else {
        this.memoryValue.emit(initial);
        this.write(initial);
      }
    } else {
      this.memoryValue.emit(value as T);
    }
  }

  private async write(value: AnyValue<T> | NoValue) {
    if (value === undefined) {
      return deleteItemAsync(this.storageKey).catch(warn);
    }

    return setItemAsync(this.storageKey, value).catch(warn);
  }
}

export function useGlobalValue<T extends Serializable>(
  value: AnyMemoryValue<T>
): [AnyValue<T>, Dispatch<SetStateAction<T | UndeterminedValue>>] {
  const snapshot = useSyncExternalStore(value.subscribe, value.getSnapshot);
  return [
    snapshot,
    value.emit as Dispatch<SetStateAction<T | UndeterminedValue>>,
  ];
}

export function useGlobalValueAsync<T extends Serializable = Serializable>(
  value: AnyMemoryValue<T>
): [[boolean, AnyValue<T>], Dispatch<SetStateAction<T | UndeterminedValue>>] {
  const [state, setState] = useGlobalValue<T>(value);
  return [[state === undefined, state], setState];
}
