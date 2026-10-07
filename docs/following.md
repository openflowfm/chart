# Following the bridge

How the chart gets what it shows, and why running it changes nothing about the set.

```
Live ─ SessionBridge :17800 ─WS─> chart server :18000 ─SSE─> phones
           (loopback)                    (the band's wifi)
```

## One connection, however many people are looking

Everyone in the band opening the chart is **one** client of the bridge, not six. The
server holds the single WebSocket; the phones get an SSE stream of a projection. That
matters for two reasons beyond tidiness: the device's face would otherwise report the
room size — five phones on the chart is one `chart[flow]` row lit, not one lit row and
`plus 4 more` — and every phone joining would otherwise be one more socket for the bridge
to broadcast every `playState` frame to.

The server sends `identify` as `chart` the moment its socket opens, which is what lights
that row. Nothing waits on it and nothing is served differently for it.

It obeys rule 5 exactly — `snapshot` without `fresh`, so the device answers from what it
already holds and Live is not touched. It never sends `observe` or `watchSelection`; those
are the device's own and a client cannot subscribe to them. Two viewport watches go out
and no more: `watchPlay`, which is the whole question this asks, and `watchTransport` for
the tempo. Starting the chart, stopping it, or losing it mid-set leaves the bridge's
knowledge of the set exactly as it was.

**A delta is answered by asking for the set again**, not by patching a copy. The bridge
already maintains the held set and rebuilds the model from it; keeping a second copy here
would be a second answer to a question that has one. `snapshot` with no `fresh` costs the
device a message and a payload.

## Reconnecting forever, in both directions

The chart may well be running before the machine with Live on it, and somebody will close
the set between songs. So `followBridge` retries every second with no limit and no error
to surface — it is either connected or it is trying, and the phone is told which.

`askAgain` covers the case that looks like success and is not: **a connected bridge is not
a bridge that can answer.** The device refuses every request with `device not ready` until
`init()` has run in `lom.ts`, so one whose device is still coming up is reachable and
unhelpful. It asks once a second until `rev` says a set landed.

The phone half needs none of that, because `EventSource` reconnects on its own. That is
most of why the stream is SSE.

## Server-Sent Events, and no dependencies at all

**A phone reading the chart has nothing to say.** It cannot fire a clip, rename a scene or
move anything, so a duplex socket would be a back channel that exists only to be misused
later. SSE is one-way by construction: there is no request type in
[`../protocol.ts`](../protocol.ts) to add one to.

That choice is also why this module installs nothing. Node has had a `WebSocket` **client**
since 22, so the connection to the bridge needs no package; the other two halves of this
project carry `ws` because they also need a *server* — the device to serve browsers,
visuals to serve the renderer. Serving phones over SSE is `node:http`, which is already
there. `chart/` has no `package.json`, no `node_modules`, and runs from a fresh clone.

## The stream is quiet

Frames are coalesced at 250ms and sent only when the JSON differs from the last one. Firing
a scene moves every track's play state, and the bridge reports that as one message per
observer; a quarter of a second is below noticing and turns the burst into one push. A
tempo readback landing on the same chart sends nothing at all.

A phone left on a music stand for an hour therefore receives one comment heartbeat every
fifteen seconds and whatever the band actually did. The heartbeat is not decoration: a
venue's captive network may put a proxy between the phone and the laptop, and a buffered
or idle-closed event stream looks exactly like a chart that has frozen.

## Why the server is bundled

`server/chart.ts` reads a scene's role and key off `SetModel.factsByScene` rather than
parsing a name, and that is a design rule — see [reading the set](reading.md). The model
comes from `@openflow/core`, and that import is what decides how the server runs.

**Node runs `.ts` directly, but refuses to strip types from anything under
`node_modules`** — and core is installed there as TypeScript source, exactly as every app
consumes it. So `node server/index.ts` fails on the first hop into core. The answer is the
same as the device's: [`tools/server.ts`](../tools/server.ts) bundles the server with
esbuild into `dist/server/index.js`, and that is what `npm start` runs and what
`npm run dev` restarts on every rebuild. Bundling doesn't care where an import lives.

It is a real constraint on any Node-side client of this suite, and the reason visual[flow]'s
[`server/show.ts`](https://github.com/openflowfm/visuals/blob/main/server/show.ts) once
carried a private `roleOf` regex rather than calling `roles.ts`. The answer taken here was
to put the per-scene facts on the wire instead of re-reading the names — the mapping being
read exactly once is the better property anyway.

## One address, in dev too

The server serves `chart/dist`, so an edit to the page shows up only after a rebuild —
which looks exactly like hot reload being broken, because the address anybody reaches for
is this one. It is the address the server prints, and the address that makes sense on a
phone.

So `OPENFLOW_CHART_UI` points it at the Vite dev server and every page request is proxied there,
and **the HMR websocket** is pointed at Vite too (below). Without the socket the page would
load from here, look right, and never update — the same failure arriving by a different
route. `npm run dev` sets it; unset, which is how it ships, nothing is proxied.

Vite has no fixed port — it takes `PORT` when a launcher picked one, otherwise a free one
from the OS — so nothing hard-codes its address. `npm run dev` ([`tools/dev.ts`](../tools/dev.ts))
settles the port, starts Vite on it, and only then starts this with `OPENFLOW_CHART_UI`
naming where Vite really is. The same port is Vite's HMR client port, so the page's
socket dials Vite directly from whichever host served the page.

The proxy falls back to `dist` when nothing answers, and that is not padding: Vite can be
stopped or restarted under a running server, and `dev:server` can be pointed at a Vite
that is not up yet.

`dev:chart` runs under `node --watch`, so editing anything in `server/` restarts it. SSE
survives that on its own — `EventSource` reconnects, and the frames are re-sent on connect.

## Binding the LAN

`0.0.0.0` here, where the device binds `127.0.0.1`. The device's client is a browser on the
same machine; this one's clients are other people's phones, so loopback would defeat the
point.

It remains a deliberate exposure, and since the tempo nudge it is a slightly larger one.
There is no authentication and it answers anyone who can reach the port, so it belongs on
rehearsal or show wifi and not on a hotel network.

What is exposed is a song title, a list of sections, where each loop has got to — and
**exactly one verb, which can move the tempo by one beat per press.** Everything else in
the protocol still never leaves loopback: nothing on the LAN can fire a clip, rename a
scene, recolour anything or reorder a set. The worst a phone can do is nudge, and the worst
a determined phone can do is nudge repeatedly, which is visible on every other phone in the
room while it happens. `OPENFLOW_CHART_HOST=127.0.0.1` takes the whole thing back to loopback
for anyone who wants that.
