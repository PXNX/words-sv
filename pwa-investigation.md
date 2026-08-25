# Android Chrome PWA investigation

## Initial live checks — 2026-08-25

The production manifest at `https://words-sv.vercel.app/manifest.webmanifest` has a name and short name, `start_url` and `scope` at `/`, standalone display mode, theme/background colors, and PNG icon declarations at 192px and 512px. These fields match Chrome's published baseline manifest criteria.

Chrome's PWA documentation also requires that a service worker control both the application page and `start_url`. The next checks will validate registration, controlling scope, icon responses, and the production document's manifest linkage.

## Live browser result

The deployed manifest and both declared PNG icons respond successfully, but the application document has no manifest link and no service-worker registration or controller. This prevents Chrome from treating the page as installable even though the manifest endpoint itself is valid. The repair must explicitly link the manifest in the SvelteKit document template and register the generated root service worker from the application client.

## Repair verification

The production build now contains a manifest link in `build/index.html`, emits the root `build/sw.js` worker, and bundles the explicit registration hook in the client entry. The managed development preview returns its SvelteKit HTML fallback for `/sw.js`, so it cannot verify a worker registered at the production path; the deployment must be checked from the statically built output and then from Vercel.

## Static production verification

When the static build was served over HTTPS, Chrome exposed the conditional **Als App installieren** action. The document linked its manifest and had an active service worker registered at `/sw.js` with root scope. The controller is expected to become active after the next page load, which is normal service-worker lifecycle behavior.

After a reload, `navigator.serviceWorker.controller` and `navigator.serviceWorker.ready` both reported the active root `/sw.js` worker. The static production build therefore now meets the manifest-link and service-worker control conditions needed for Chrome PWA installation.
