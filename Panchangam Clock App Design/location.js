// Observer location for the Pañcāṅga screens: the device's current position via the
// Geolocation API, with the device's own UTC offset as tz. Last fix is cached so a reload
// starts where you were; Chennai is the fallback when location is denied or unavailable.
// window.HoraLocation.get() -> { name, lat, lon, tz, coord, source }
// window.HoraLocation.subscribe(cb) -> unsubscribe   (cb fires only when the location changes)
(function () {
  if (window.HoraLocation) return;
  const KEY = 'hora.location.v1';
  const MOVE_DEG = 0.05; // ~5 km: ignore GPS jitter below this
  const deviceTz = () => -new Date().getTimezoneOffset() / 60;
  const coordStr = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  const make = (lat, lon, tz, source, name) => ({ name: name || (source === 'gps' ? 'Your location' : 'Last known location'), lat, lon, tz, coord: coordStr(lat, lon), source });
  const FALLBACK = make(13.0827, 80.2707, 5.5, 'default', 'Chennai');

  let cur = FALLBACK;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && isFinite(c.lat) && isFinite(c.lon)) cur = make(c.lat, c.lon, deviceTz(), 'cached');
  } catch (e) { /* storage unavailable */ }

  const subs = new Set();
  function set(loc) {
    cur = loc;
    try { localStorage.setItem(KEY, JSON.stringify({ lat: loc.lat, lon: loc.lon })); } catch (e) { /* ignore */ }
    subs.forEach((cb) => { try { cb(cur); } catch (e) { console.error(e); } });
  }
  function onFix(pos) {
    const lat = pos.coords.latitude, lon = pos.coords.longitude, tz = deviceTz();
    const moved = cur.source !== 'gps' || Math.abs(lat - cur.lat) > MOVE_DEG || Math.abs(lon - cur.lon) > MOVE_DEG || tz !== cur.tz;
    if (moved) set(make(lat, lon, tz, 'gps'));
  }
  function start() {
    if (!navigator.geolocation) return;
    const opts = { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 20000 };
    navigator.geolocation.getCurrentPosition(onFix, () => {}, opts);
    navigator.geolocation.watchPosition(onFix, () => {}, opts);
  }

  window.HoraLocation = {
    get: () => cur,
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
  };
  start();
})();
