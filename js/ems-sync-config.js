/* ══ PHONE ↔ WEB SYNC: WHERE THE SHARED DATA LIVES (product owner, 14 Nov 2026) ═══════════════════════════════════
   The Supabase project both apps use. Fill in the Project URL and the Publishable key (sb_publishable_...) from
   Supabase → Project Settings → API Keys. Never put the secret key here: this file is public.
   Left empty, the sync is off and the web app works exactly as before. The mobile app has the same two values in
   its own js/sync-config.js. */
window.EMS_SYNC_CONFIG={
  url:'',
  key:''
};
