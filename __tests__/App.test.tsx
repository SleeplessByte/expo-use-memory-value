import React from 'react';
import { Pressable, Text } from 'react-native';
import { ReactTestRenderer, act, create } from 'react-test-renderer';

import {
  AnyMemoryValue,
  MemoryValue,
  SecureStoredMemoryValue,
  Serializable,
  StoredMemoryValue,
  useGlobalValue,
} from '../index.ts';

let MEMORY_VALUE = new MemoryValue({ answer: 42 });
let STORED_MEMORY_VALUE = new StoredMemoryValue(
  'expo-use-memory-value.test.stored',
  { doctor: 'who' }
);
let SECURE_MEMORY_VALUE = new SecureStoredMemoryValue(
  'expo-use-memory-value.test.secure',
  { secure: 'absolutely' }
);

function App<T extends Serializable>({
  memory,
}: {
  memory: AnyMemoryValue<T>;
}) {
  const [memoryValue, setAnswer] = useGlobalValue(memory);

  return (
    <Pressable
      testID="button"
      onPress={() => setAnswer('How would I know' as any)}
    >
      <Text>{JSON.stringify(memoryValue ?? '"_empty_"')}</Text>
    </Pressable>
  );
}

describe('<App /> with useGlobalValue(MemoryValue)', () => {
  beforeEach(() => {
    // Normally we would not do this but we want consistent test snapshots even
    // if the order of the tests is changed
    MEMORY_VALUE = new MemoryValue({ answer: 42 });
  });

  it('renders and updates', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });

  it('can be updated from outside', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      MEMORY_VALUE.emit('I do know!' as any);
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });
});

describe('<App /> with useGlobalValue(StoredMemoryValue)', () => {
  beforeEach(() => {
    // Normally we would not do this but we want consistent test snapshots even
    // if the order of the tests is changed
    STORED_MEMORY_VALUE = new StoredMemoryValue(
      'expo-use-memory-value.test.stored' + Math.random().toString(36),
      { doctor: 'who' }
    );
  });

  it('renders and updates', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={STORED_MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });

  it('can be updated from outside', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={STORED_MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      STORED_MEMORY_VALUE.emit('I do know!' as any);
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });
});

describe('<App /> with useGlobalValue(SecureStoredMemoryValue)', () => {
  beforeEach(() => {
    // Normally we would not do this but we want consistent test snapshots even
    // if the order of the tests is changed
    SECURE_MEMORY_VALUE = new SecureStoredMemoryValue(
      'expo-use-memory-value.test.secure' + Math.random().toString(36),
      { secure: 'absolutely' }
    );
  });

  it('renders and updates', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={SECURE_MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });

  it('can be updated from outside', async () => {
    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<App memory={SECURE_MEMORY_VALUE} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).not.toBeNull();
    expect(tree).toMatchSnapshot();

    // Simulate press
    await act(() => {
      SECURE_MEMORY_VALUE.emit('I do know!' as any);
    });

    const newTree = renderer!.toJSON();
    expect(newTree).not.toBeNull();
    expect(newTree).toMatchSnapshot();
  });
});
