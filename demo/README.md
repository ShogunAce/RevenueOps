# RevenueOps demo video

Remotion project for the ~73s narrated product demo. Screens are real captures of the app running on its fictional sample workspace; narration is ElevenLabs (voice "Jonathan", `eleven_v4`), one continuous take.

1. Start the app on an **empty** data folder so it seeds the 8 sample prospects:
   `REVENUEOPS_DATA_DIR=<empty dir> node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4180 --strictPort` (from the repo root)
2. `npm run capture` — saves `public/shots/*.png` and the click positions in `src/targets.json`.
3. `npm run studio` to preview, `npm run render` to write `out/revenueops-demo.mp4`.

Scene cuts follow `src/timing.json`: the start of each narration sentence, taken from ElevenLabs Scribe word timestamps. If you change the script, regenerate the voice-over, re-transcribe it, and update those times.
