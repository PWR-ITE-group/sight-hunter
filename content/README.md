# content

Game content. Owners: C (places, reference photos, thresholds) and D (reels).

## Places (C)

- `places.yaml` — places of the demo route with task and 3 hints in Polish (hand-written),
  plus QID, coordinates and Commons category filled by `fetch_places`. The API seed reads it.
- `refs/<slug>/` — reviewed reference photos (exterior, as a player sees it), 5–10 per place.
  `sources.yaml` next to them keeps source, author and license; own photos need no entry.
  `refs/<slug>/candidates/` are raw Commons downloads (gitignored).
- `test-photos/<slug>/` — own daytime photos for threshold tuning; `test-photos/_none/` —
  photos of no place (plain kamienice, streets). Gitignored.
- `calibration/` — threshold reports from `calibrate`.

Workflow (commands run from `worker/`, see `worker/README.md`):

1. `python -m app.cli.fetch_places --refs 40` — coordinates and Commons candidates.
2. `python -m app.cli.pick_refs` — pre-selects 8 per place into `refs/<slug>/`. Look through
   them and delete interiors, details, night shots, other buildings. Add own photos.
3. `python -m app.cli.add_refs` — embeddings into `place_refs`.
4. Put own photos into `test-photos/`, run `python -m app.cli.calibrate`, copy the
   recommended `VERIFY_*` values into the worker env.

## Reels (D)

Planned: `generate_reel.py` (facts → script → TTS → ffmpeg).
