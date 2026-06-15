/* ============================================================
   imsr-flag.js — disabled-by-default feature flag for FUTURE IMSR work.

   This lives OUTSIDE js/ so the live app's config.js stays untouched. The
   production app (index.html → js/ui.js) does NOT import this file, so the flag
   has zero runtime effect today. It exists only so future IMSR integration code
   can gate itself behind a single, obvious, OFF switch.

   Mirrors the project's existing dev-toggle convention (ui.js DEBUG_DOTS:
   a URL-param check). Even when "on", NOTHING integrates into the map — turning
   it on only unlocks the validation harness for inspection.
   ============================================================ */

/* Master switch. MUST stay false until integration is explicitly approved. */
export const IMSR_ENABLED = false;

/* Dev-only override for the harness page: append ?imsr to the URL to flip this
   on for inspection without editing the constant. Has no effect on the live app
   (which never imports this module). */
export function imsrEnabled() {
  if (IMSR_ENABLED) return true;
  try { return new URLSearchParams(location.search).has('imsr'); }
  catch { return false; }
}
