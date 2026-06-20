// src/nav/webviewGeo.ts
//
// Avoids the duplicate location prompt inside in-app WebViews. iOS WKWebView
// shows its OWN per-website prompt when a page calls navigator.geolocation —
// separate from the native expo-location permission the app already requested.
//
// We override navigator.geolocation inside the WebView so the page uses the
// coordinates the native app already has. No web-origin prompt is ever shown.

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as Location from "expo-location";
import type WebView from "react-native-webview";

/** Runs BEFORE page scripts: replaces navigator.geolocation with one backed by
 *  window.__WYD_COORDS__ (pushed from native), polling briefly until it's set. */
export const GEO_POLYFILL = `
(function(){
  try {
    function emit(cb){
      var c = window.__WYD_COORDS__;
      if (c && cb) cb({ coords:{ latitude:c.lat, longitude:c.lng, accuracy:c.acc||50, altitude:null, altitudeAccuracy:null, heading:null, speed:null }, timestamp: Date.now() });
    }
    var geo = {
      getCurrentPosition: function(success, error){
        if (window.__WYD_COORDS__){ emit(success); return; }
        var n=0, t=setInterval(function(){
          if (window.__WYD_COORDS__){ clearInterval(t); emit(success); }
          else if (++n > 16){ clearInterval(t); if (error) error({ code:2, message:'position unavailable' }); }
        }, 125);
      },
      watchPosition: function(success){ emit(success); return 0; },
      clearWatch: function(){}
    };
    try { Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true }); }
    catch(e){ try { navigator.geolocation = geo; } catch(_){} }
  } catch(e){}
})();
true;
`;

function coordsInjection(lat: number, lng: number, acc: number) {
  return `window.__WYD_COORDS__ = { lat:${lat}, lng:${lng}, acc:${acc} }; true;`;
}

/**
 * Fetches the device location WITHOUT prompting (only when permission was
 * already granted elsewhere, e.g. Home/Map). Returns pushCoords(), which feeds
 * the latest coords into the given WebView — call it on each page load.
 */
export function useWebViewGeo(webRef: RefObject<WebView | null>) {
  const coordsRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);

  const pushCoords = useCallback(() => {
    const c = coordsRef.current;
    if (c && webRef.current) webRef.current.injectJavaScript(coordsInjection(c.lat, c.lng, c.acc));
  }, [webRef]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync(); // never prompts
        if (!perm.granted) return;
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          coordsRef.current = { lat: last.coords.latitude, lng: last.coords.longitude, acc: last.coords.accuracy ?? 50 };
          pushCoords();
        }
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cur && !cancelled) {
          coordsRef.current = { lat: cur.coords.latitude, lng: cur.coords.longitude, acc: cur.coords.accuracy ?? 50 };
          pushCoords();
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pushCoords]);

  return { pushCoords };
}
