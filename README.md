# expo-use-memory-value

Hooks for global state in memory and local storage (platform dependent). It's like context, but only one state per value; allows you to subscribe and update values from far away.

Tested against SDK 40.

If you're looking for non expo implementation: [`use-memory-value`](https://github.com/SleeplessByte/use-memory-value).

## Installation

```bash
yarn add expo-use-memory-value
```

It has the following peerDependencies, along with `react` and `react-native` / `react-native-web`:

```bash
yarn add @react-native-community/async-storage expo-secure-store localforage react-fast-compare
# assumes already installed:
# - react
# - react-native
# - react-native-web
```

If you _only_ target the web, you can use the following, and ignore the warnings about `async-storage` and `expo-secure-store`:

```bash
yarn add localforage react-fast-compare
# assumes already installed:
# - react
# - react-native-web
```

If you _do not_ target the web, you can use the following, and ignore the warnings about `localforage`:

```bash
yarn add @react-native-community/async-storage expo-secure-store react-fast-compare
# assumes already installed:
# - react
# - react-native
```

## Usage

Start by creating a new `MemoryValue` or `StoredMemoryValue`. You can declare this in any file, make sure it's exported and importable from all the files you want to use the value.

```typescript
import { MemoryValue } from 'use-memory-value';

type State = {
  foo: number;
  bar: string;
  baz?: boolean;
};

const INITIAL_STATE: State = {
  foo: 42,
  bar: 'yes',
};

export const MY_STATE = new MemoryValue<State>(INITIAL_STATE);
```

Then, where you want to use the value, import the `MemoryValue` and `useMemoryValue`:

```tsx
import { useMemoryValue, useMutableMemoryValue } from 'use-memory-value';

import { MY_STATE } from '../path/to/state';

function ReadOnlyBar() {
  const state = useMemoryValue(MY_STATE);
  return <h1>foo: {state && state.foo}</h1>;
}

function CountingFoo() {
  const [state, updateState] = useMutableMemoryValue(MY_STATE);
  const increment = () =>
    updateState((prev) => ({ ...prev, foo: prev.foo + 1 }));

  return (
    <button type="button" onClick={increment}>
      Foo: {state.foo}
    </button>
  );
}

function ActivateBaz() {
  const [, updateState] = useMutableMemoryValue(MY_STATE);
  const activate = () => updateState((prev) => ({ ...prev, baz: true }));

  return (
    <button type="button" onClick={activate}>
      Activate
    </button>
  );
}
```

If the value should be persisted to (and initialized from) local storage, use `StoredMemoryValue`:

```typescript
export const MY_STATE = new StoredMemoryValue<State>('local.key.name');
```

## TypeScript warnings

It is _important_ to use `type` and not `interface` when using this in conjunction with TypeScript. The reason for this is that `interfaces` are _extendible_ and thus we can not safely say that the final resolved shape is serializable (JSON-compatible). `types` are fixed, and thus can be checked.

You want this because non-serializable fields would be lost during serialization/deserialization, and thus can cause run-time issues.

If you get errors that the type is not `Serializable`, make sure you're only using `type` and not `interface`.

## Android/iOS secure storage

Swap `StoredMemoryValue` for `SecureStoreMemoryValue`. This will use `expo-secure-storage` under the hood for native platforms. On the `web` it falls back to `localforage`. **Values on the web are never secure**.

Note: There are limitations to storage size.

## Web configuration

For the web it uses `localforage` under the hood. You can set the instance yourself by importing

```typescript
import { setLocalForageInstance } from 'expo-use-memory-value/storage.web';
```
