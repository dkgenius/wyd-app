// src/nav/links.ts
//
// Classify whatyoudink.com URLs tapped inside a WebView so we can route them to
// the matching NATIVE screen instead of loading the website page in the app.

/** The website home page (whatyoudink.com root, or /index.php). → native Home tab. */
export function isSiteHomeUrl(u: string): boolean {
  return (
    /\/\/(?:www\.)?whatyoudink\.com\/?(?:[?#]|$)/i.test(u) ||
    /whatyoudink\.com\/index\.php(?:[?#]|$)/i.test(u)
  );
}

/** The website map page (e.g. /map.php, /map.php?q=…, /map). → native Map tab. */
export function isMapUrl(u: string): boolean {
  return /\/map\.php(?:[?#]|$)/i.test(u) || /whatyoudink\.com\/map(?:[/?#]|$)/i.test(u);
}

/** A directory listing — the index (/courts/) or a state/city hub (/courts/in/…).
 *  NOT an individual court page (/courts/{slug}), which stays in the WebView. */
export function isCourtsDirectoryUrl(u: string): boolean {
  return /\/courts\/(?:in\/|[?#]|$)/i.test(u);
}
