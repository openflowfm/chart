# chart[flow]

Read [`README.md`](README.md) as the topic index, then only the docs matching the change.

- This is a **read-only** client of the bridge, and the only open[flow] module that binds
  the LAN. One verb crosses to the wifi — a relative tempo nudge — and nothing else may.
  A phone must never be able to fire, rename, recolour or reorder anything.
- Every fact on the page is one the set states — a scene name, a clip's notes. Nothing is
  inferred; see [reading the set](docs/reading.md) before adding anything that guesses.
- Nothing loads from a CDN. This runs on stage, on a venue's wifi.
- Don't name things with words that already mean something in a DAW: transport, scene,
  clip, cue, bus, send, return, warp, quantize, follow action, slot, take, punch. Where a
  DAW term *is* the Live concept, use it precisely.
- Imports use the real TypeScript extension — `@openflow/core/derive.ts`, `./loops.ts`.
- A change to how a feature works updates that feature's topic doc in the same commit.
  A doc that drifts is worse than none, because it's believed.

Run `npm ci`, `npm run typecheck`, `npm test` and `npm run build`. `npm run dev` needs a
running bridge — [openflowfm/bridge](https://github.com/openflowfm/bridge) — and a phone
on the same wifi is the only way to check what this is for.

Every agent commit must end with a blank line and:

Co-authored-by: Codex <noreply@openai.com>
