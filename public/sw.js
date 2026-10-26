const CACHE_NAME = "omniconvert-shell-__CACHE_VERSION__";
const PRECACHE_ASSETS = __PRECACHE_ASSETS__;

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_ASSETS))
			.then(() => undefined),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) =>
								key.startsWith("omniconvert-shell-") && key !== CACHE_NAME,
						)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === "navigate" && url.pathname === "/") {
		event.respondWith(
			fetch(request).catch(async () => {
				try {
					const cache = await caches.open(CACHE_NAME);
					return (await cache.match("/")) ?? Response.error();
				} catch {
					return Response.error();
				}
			}),
		);
		return;
	}

	const isAppAsset =
		(url.pathname.startsWith("/assets/") ||
			url.pathname.startsWith("/engines/")) &&
		(request.destination === "script" ||
			request.destination === "style" ||
			request.destination === "worker" ||
			request.destination === "font" ||
			url.pathname.endsWith(".wasm"));
	if (!isAppAsset) return;

	event.respondWith(
		(async () => {
			let cache = null;
			try {
				cache = await caches.open(CACHE_NAME);
				const cached = await cache.match(request);
				if (cached) return cached;
			} catch {
				cache = null;
			}

			const response = await fetch(request);
			if (response.ok && response.type === "basic") {
				try {
					cache ??= await caches.open(CACHE_NAME);
					await cache.put(request, response.clone());
				} catch {
					// Storage quota or cache policy must not turn a successful fetch into a failure.
				}
			}
			return response;
		})(),
	);
});
