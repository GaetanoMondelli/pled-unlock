import { SimpleFSM } from '../SimpleFSM';
import { FSMDefinition, Message } from '../types';

describe('SimpleFSM', () => {
  const createTestFSM = (): SimpleFSM => {
    const definition: FSMDefinition = {
      states: [
        { id: 'idle', actions: [] },
        { id: 'processing', actions: [] },
        { id: 'success', actions: [] },
        { id: 'failure', actions: [] }
      ],
      transitions: [
        { from: 'idle', to: 'processing', trigger: 'start' },
        { from: 'processing', to: 'success', trigger: 'complete' },
        { from: 'processing', to: 'failure', trigger: 'fail' },
        { from: 'failure', to: 'processing', trigger: 'retry' },
        { from: 'success', to: 'idle', trigger: 'reset' }
      ],
      initialState: 'idle'
    };

    return new SimpleFSM(definition);
  };

  test('should initialize with initial state', () => {
    const fsm = createTestFSM();
    expect(fsm.getCurrentState()).toBe('idle');
  });

  test('should transition to valid next state', () => {
    const fsm = createTestFSM();
    const message: Message = {
      id: 'msg1',
      type: 'start',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event1'
    };

    const transition = fsm.processMessage(message);

    expect(transition).not.toBeNull();
    expect(transition!.from).toBe('idle');
    expect(transition!.to).toBe('processing');
    expect(transition!.trigger).toBe('start');
    expect(fsm.getCurrentState()).toBe('processing');
  });

  test('should not transition on invalid message', () => {
    const fsm = createTestFSM();
    const message: Message = {
      id: 'msg1',
      type: 'invalid',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event1'
    };

    const transition = fsm.processMessage(message);

    expect(transition).toBeNull();
    expect(fsm.getCurrentState()).toBe('idle');
  });

  test('should check if transition is possible', () => {
    const fsm = createTestFSM();

    expect(fsm.canTransition('start')).toBe(true);
    expect(fsm.canTransition('complete')).toBe(false);
    expect(fsm.canTransition('invalid')).toBe(false);
  });

  test('should get all states', () => {
    const fsm = createTestFSM();
    const states = fsm.getAllStates();

    expect(states).toContain('idle');
    expect(states).toContain('processing');
    expect(states).toContain('success');
    expect(states).toContain('failure');
  });

  test('should complete full workflow', () => {
    const fsm = createTestFSM();

    // Start processing
    let message: Message = {
      id: 'msg1',
      type: 'start',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event1'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('processing');

    // Complete successfully
    message = {
      id: 'msg2',
      type: 'complete',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event2'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('success');

    // Reset to idle
    message = {
      id: 'msg3',
      type: 'reset',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event3'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('idle');
  });

  test('should handle failure and retry', () => {
    const fsm = createTestFSM();

    // Start processing
    let message: Message = {
      id: 'msg1',
      type: 'start',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event1'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('processing');

    // Fail
    message = {
      id: 'msg2',
      type: 'fail',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event2'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('failure');

    // Retry
    message = {
      id: 'msg3',
      type: 'retry',
      timestamp: new Date().toISOString(),
      data: {},
      fromEvent: 'event3'
    };
    fsm.processMessage(message);
    expect(fsm.getCurrentState()).toBe('processing');
  });
});