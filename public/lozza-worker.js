// public/lozza-worker.js
console.log('[LozzaWorker] Worker script starting...');

try {
  // Betöltjük a módosított lozza.js-t a public/lib/lozza/ mappából.
  importScripts('/lib/lozza/lozza.js');

  console.log('[LozzaWorker] lozza.js imported successfully. Engine should be self-initializing.');
  // A lozza.js (a módosítás után) már nem fog fs.readFileSync hibát dobni.
  // A lozza.js fájl vége felé lévő onmessage handler fogja kezelni az UCI parancsokat.
  // Küldhetünk egy jelzést a fő szálnak, hogy a worker scriptünk végrehajtása befejeződött.
  self.postMessage('[LozzaWorker] Worker script initialized and lozza.js loaded.');

} catch (e) {
  console.error('[LozzaWorker] ERROR during importScripts of lozza.js or its execution:', e);
  let errorMessage = '[LozzaWorker] FATAL ERROR: Failed to execute engine script: ' + e.message;
  if (e.stack) {
    errorMessage += "\nStack: " + e.stack;
  }
  self.postMessage(errorMessage);
  self.close(); // Hiba esetén leállítjuk a workert
}