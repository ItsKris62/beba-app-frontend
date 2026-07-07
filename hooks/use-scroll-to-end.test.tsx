import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useScrollToEnd } from './use-scroll-to-end';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  observed: Element | null = null;
  disconnected = false;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed = el;
  }
  disconnect() {
    this.disconnected = true;
  }
  unobserve() {}
}

function TestComponent({ onReachedEnd }: { onReachedEnd: (v: boolean) => void }) {
  const { containerRef, sentinelRef, reachedEnd } = useScrollToEnd<HTMLDivElement>();
  React.useEffect(() => { onReachedEnd(reachedEnd); }, [reachedEnd, onReachedEnd]);
  return (
    <div ref={containerRef} data-testid="container">
      <p>Disclosure text</p>
      <div ref={sentinelRef} data-testid="sentinel" />
    </div>
  );
}

describe('useScrollToEnd', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports reachedEnd=false until the sentinel intersects', () => {
    const states: boolean[] = [];
    render(<TestComponent onReachedEnd={(v) => states.push(v)} />);

    expect(states.at(-1)).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    const observer = MockIntersectionObserver.instances[0];
    act(() => { observer.callback([{ isIntersecting: true }]); });

    expect(states.at(-1)).toBe(true);
  });

  it('does not flip to reachedEnd when the sentinel is not yet intersecting', () => {
    const states: boolean[] = [];
    render(<TestComponent onReachedEnd={(v) => states.push(v)} />);

    const observer = MockIntersectionObserver.instances[0];
    act(() => { observer.callback([{ isIntersecting: false }]); });

    expect(states.at(-1)).toBe(false);
  });

  it('disconnects the observer once the sentinel has been reached', () => {
    render(<TestComponent onReachedEnd={() => {}} />);
    const observer = MockIntersectionObserver.instances[0];
    act(() => { observer.callback([{ isIntersecting: true }]); });
    expect(observer.disconnected).toBe(true);
  });
});
