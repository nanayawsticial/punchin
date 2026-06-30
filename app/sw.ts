// app/sw.ts
import withSerwist from "@serwist/next";

export const serwist = withSerwist({
// Precache of build assets is handled automatically.
// Additional custom runtime caching can be implemented using Workbox APIs within the service worker.

});

export default serwist;
