# chart[flow]

What the band reads. A one-screen view of the song the set is playing — its name, its key,
its tempo with a button either side of it, where every playing loop has got to, and the bass
part as a piano roll, copied note for note out of the clip and coloured by scale degree —
served to everyone's phone, with no dependencies and nothing to install.

```
Live ─ SessionBridge :17800 ─WS─> chart server :18000 ─SSE─> phones
           (loopback)                    (the band's wifi)
```

## Standalone

This repo builds and runs on its own — it needs no checkout of any other open[flow] repo.

```sh
git clone https://github.com/openflowfm/chart.git
cd chart
npm ci
npm run build    # the page into dist/, and the server bundled beside it
npm start        # the server on :18000, serving dist/ and following the bridge
npm run dev      # the server rebuilt and restarted on change, and Vite on a free port for the page
```

The one thing it depends on at runtime is the bridge: **SessionBridge**, the Max for Live
device from [openflowfm/bridge](https://github.com/openflowfm/bridge) that reads a Live
set and serves it over WebSocket on port 17800. Point this at wherever it is running with
`OPENFLOW_BRIDGE_WS` (default `ws://127.0.0.1:17800/ws`). The server is bundled by esbuild
rather than run from source, because Node will not strip types from `@openflow/core` under
`node_modules` — [`tools/server.ts`](tools/server.ts).

| script | does |
|---|---|
| `npm run build` | `dist/` — the page, then `dist/server/index.js` |
| `npm start` | the built server, on the LAN |
| `npm run dev` | the Vite dev server, then the server watch loop pointed at it ([`tools/dev.ts`](tools/dev.ts)); the page is proxied through `:18000` so a phone uses one address |
| `npm run typecheck` | `src/`, `server/` and `tools/` |
| `npm test` | the server's unit tests — `chart.ts`, `loops.ts`, `bassline.ts` |

## Where the reasoning lives

**Read the row you need, not the set.**

| doc | read it before touching | source |
|---|---|---|
| [following the bridge](docs/following.md) | the connection, **re-arming the watches**, the two streams and why a phone extrapolates, the tempo nudge, the LAN binding, and why the server is bundled | `server/bridge.ts`, `server/index.ts`, `server/loops.ts` |
| [reading the set](docs/reading.md) | which scene is "now", which song, where a fact is printed, the wheels, the bass roll, and what is deliberately not built | `server/chart.ts`, `server/loops.ts`, `server/bassline.ts`, `protocol.ts` |

## The one idea

**A chart states each fact once, as high up as it is true.**

A song in one key states it in the heading. A song that modulates cannot — so the heading
takes the key of the section actually playing, which is the useful answer on a stage. The
tempo works the same way: the big number is what Live is running at, and the song name's
claim appears only when the two disagree. Everything else here follows from wanting that to
be true without anybody typing it twice: the facts are read out of the scene names once, by
the bridge, and this reads them off `SetModel`.

## Running it

```sh
npm run dev                # everything, this included. Use :18000 — it proxies the page
                           # from Vite, HMR socket and all, so one address works in dev too
npm run dev:server         # the server alone, :18000, rebuilt and restarted on change
npm run dev:ui             # the page alone with HMR, on $PORT or a free port
npm run build:chart        # the page into chart/dist, which the server serves when
                           # OPENFLOW_CHART_UI is unset — which is how it ships
```

The server prints every address a phone can reach it on. Whoever is running Live reads one
out; everyone else types it once and adds it to their home screen.

| | | |
|---|---|---|
| server | 18000 | `OPENFLOW_CHART_PORT`, `OPENFLOW_CHART_HOST` |
| page (dev) | a free port, never a fixed one | `PORT` |
| bridge it follows | `ws://127.0.0.1:17800/ws` | `OPENFLOW_BRIDGE_WS` |
| the page, in dev | `chart/dist` unless set | `OPENFLOW_CHART_UI` |

Working on it without Ableton is the same harness the visuals rig uses:

```sh
npm run dev:fake-live                                            # :17801
OPENFLOW_BRIDGE_WS=ws://127.0.0.1:17801/ws npm run dev:chart
```

## One verb, and no others

This server holds **one** connection to the bridge however many people are looking, and
what crosses to the wifi is a projection plus a single verb: `POST /tempo` with `{ by: 1 }`
or `{ by: -1 }`. Relative and one beat at a time, so a phone cannot state a tempo and
cannot move a set by more than a press. Everything else in the protocol stays on
loopback — nothing on the wifi can fire a clip, rename a scene, recolour anything or
reorder a set.

That is why the module is a separate process rather than a route on the device: the device
binds `127.0.0.1` deliberately, and putting a chart on the band's phones without also
putting every write in the protocol there means something narrow in between. The bridge's rule that
[the device holds the set](https://github.com/openflowfm/bridge/blob/main/AGENTS.md)
anticipated it — *"a second kind of client — a stage display,
a CLI — should cost nothing and perturb nothing"* — and this is the stage display, now
with one button on it.

## Nothing here is inferred any more

The bass roll drew inferred chord symbols first — every playing MIDI clip merged, drums
judged out by the shape of their notes, the rest fitted to chord templates. It was the one
part of this client that could be wrong while nothing was broken, and on real material it
was: a melody note on a bar line renamed the chord under it, and quantising into windows
moved notes played off the grid on purpose.

The part was written down the whole time, so the roll copies it instead. Every fact on the
phone is now something the set states — the songs and keys in scene names, the notes in the
clip. The inference is still in [`chords.ts` in `@openflow/core`](https://github.com/openflowfm/core/blob/main/docs/chords.md) with its
tests and no caller, for the day the keys player wants a chord chart of their own.

## What it is for next

The wheels and the roll are the beginning of the real goal rather than the end of it:
**anyone on stage should be able to see what is coming without having played the song
before.** What is still missing is the harmony for everybody who is not the bass player, and
when the long loop comes round — each wheel says where it is, and nothing yet says when they
line up, which is the question "when do I drop" actually asks. Both are argued in
[reading the set](docs/reading.md).
