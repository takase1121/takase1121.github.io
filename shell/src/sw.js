// Force immediate activation without waiting
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // Take control of unmonitored clients immediately
});

// stats tracking
const txStats = {};
const createTxStats = () => ({
    blobTx: 0,
    wasmTx: 0,
    blobInFlightTx: 0,
    wasmInFlightTx: 0,
    lastActive: 0,
    currentFile: ''
});
const IN_FLIGHT_THRESHOLD = 50 * 1024;

self.addEventListener('message', (event) => {
    const clientId = event.source.id;
    const data = event.data;

    switch (event.data.type) {
        case 'tx-stats':
            const stat = txStats[clientId];
            return event.source.postMessage({ type: 'tx-stats', 'response': stat === undefined ? createTxStats() : stat });
    }
    event.source.postMessage({ type: event.data.type, 'error': 'unknown type' });
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('sw-ping')) {
        return event.respondWith(new Response(null, { status: 200 }));
    }

    event.respondWith(
        (async () => {
            const clientId = event.clientId;
            const client = await self.clients.get(clientId);

            const response = await fetch(event.request);

            // Handle opaque responses (status 0 / no-cors requests) directly
            if (!response.ok || response.status === 0 || response.type === 'opaque') {
                return response;
            }

            let body = response.body;
            if (url.pathname.includes('/blobs/sha256') || url.pathname.endsWith('.wasm') || url.pathname.endsWith('.data')) {
                let size = Number.parseInt(response.headers.get('content-length'));
                if (Number.isNaN(size))
                    size = 0;

                if (txStats[clientId] === undefined)
                    txStats[clientId] = createTxStats();
                const stat = txStats[clientId];

                const txToUpdate = url.pathname.includes('/blobs/sha256') ? 'blob' : 'wasm';
                stat[txToUpdate + 'Tx'] += size;
                stat.lastActive = Date.now();

                stat.currentFile = txToUpdate == 'blob' ? `sha256:${url.pathname.split('/').pop().slice(0, 6)}` : url.pathname.split('/').pop();
                // if the size is lower than 50kb, we don't track in flight data
                if (size < IN_FLIGHT_THRESHOLD) {
                    stat[txToUpdate + 'InFlightTx'] += size;
                    client.postMessage({ type: 'tx-stats', response: stat });
                } else {
                    // use a stream to track in flight traffic
                    const reader = response.body.getReader();
                    const trackingStream = new ReadableStream({
                        async start(controller) {
                            const INTERVAL_MS = 100;
                            const tx = txToUpdate + 'InFlightTx';
                            let lastNotify = 0;

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) {
                                    controller.close();
                                    client.postMessage({ type: 'tx-stats', response: stat });
                                    break;
                                }
                                stat[tx] += value.byteLength;
                                controller.enqueue(value);

                                const now = performance.now();
                                if (now - lastNotify >= INTERVAL_MS) {
                                    client.postMessage({ type: 'tx-stats', response: stat });
                                    lastNotify = now;
                                }
                            }
                        }
                    });
                    body = trackingStream;
                }
            }

            // Reconstruct non-opaque responses with custom headers
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');

            return new Response(body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        })()
    );
});