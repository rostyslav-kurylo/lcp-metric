// Implements LargestContentfulPaint calculation
// Provides timing information about the largest image or text paint before user input on a web page
export class LargestContentfulPaint {
    private readonly _lcpCandidatesElements: string[] = [
        'img',
        'image',
        'video',
        'iframe',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'li',
    ];
    private readonly _callback: (entry: PerformanceEntry) => void;
    private _largestSize: number;
    private _largestEntry: PerformanceEntry;
    private _observer: MutationObserver;
    private _intersectionObserver: IntersectionObserver;

    constructor(callback: (entry: PerformanceEntry) => void) {
        this._callback = callback;
        this._largestSize = 0;
        this._largestEntry = null;
        this._observer = new MutationObserver(this._checkMutations.bind(this));
        this._observer.observe(document, { childList: true, subtree: true });

        this._intersectionObserver = new IntersectionObserver(this._checkForLCP.bind(this), {
            threshold: 0.0, // Trigger callback when even a tiny bit of the element is in the viewport
        });
    }

    private _checkMutations = (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && this._lcpCandidatesElements.includes(node.nodeName.toLowerCase())) {
                    this._intersectionObserver.observe(node as Element);
                }
            });
        }
    };

    private _checkForLCP = (entries: IntersectionObserverEntry[]) => {
        for (const entry of entries) {
            const area = entry.boundingClientRect.width * entry.boundingClientRect.height;
            if (entry.isIntersecting && area > this._largestSize) {
                this._largestSize = area;
                const largestEntry = {
                    entryType: 'largest-contentful-paint',
                    startTime: performance.now(),
                    size: this._largestSize,
                    element: entry.target,
                    duration: 0,
                    name: '',
                };
                this._largestEntry = {
                    ...largestEntry,
                    toJSON(): string {
                        return JSON.stringify(largestEntry);
                    },
                };

                this._callback(this._largestEntry);
            }
        }
    };

    public disconnect = (): void => {
        this._observer.disconnect();
        this._intersectionObserver.disconnect();
    };
}

interface PerformanceEntry {
    entryType: string;
    startTime: DOMHighResTimeStamp;
    size: number;
    element: Element;
    duration: DOMHighResTimeStamp;
    name: string;

    toJSON(): string;
}  