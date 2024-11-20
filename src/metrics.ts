const isBrowserSupportsLcpApi = (): boolean =>
  'PerformanceObserver' in window &&
  'PerformanceEntry' in window &&
  PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint');

const createPerformanceObserver = (callback: (PerformanceEntry) => void): PerformanceObserver => {
  const performanceObserver: PerformanceObserver = new PerformanceObserver(
    (list: PerformanceObserverEntryList): void => {
      const entries: PerformanceEntryList = list.getEntries();
      const lastEntry: PerformanceEntry = entries[entries.length - 1]; // Use the latest LCP candidate

      if (lastEntry && callback) {
        callback(lastEntry);
      }
    },
  );

  performanceObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  return performanceObserver;
};

export const runMetrics = (): void => {
  const cbTimeout = 5000;
  let lastPerformanceEntry: PerformanceEntry;
  let lcp;
  let timeoutId: number;
  let cleanUp: () => void;

  const onNewPerformanceEntry = (data: PerformanceEntry): void => {
    lastPerformanceEntry = data;

    timeoutId && clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      cleanUp && cleanUp();
    }, cbTimeout);
  };

  if (isBrowserSupportsLcpApi()) {
    lcp = createPerformanceObserver(onNewPerformanceEntry);
  } else {
    import('./largestContentfulPaint').then((module) => {
      lcp = new module.LargestContentfulPaint(onNewPerformanceEntry);
    });
  }

  const abortController: AbortController = new AbortController();
  const abortSignal: AbortSignal = abortController.signal;
  cleanUp = (): void => {
    lcp.disconnect();
    abortController.abort();
    timeoutId && clearTimeout(timeoutId);
  };

  ['click', 'keydown'].forEach((type: string) => {
    document.addEventListener(
      type,
      () => {
        cleanUp();
      },
      { signal: abortSignal },
    );
  });
};