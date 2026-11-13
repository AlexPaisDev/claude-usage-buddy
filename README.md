# Claude Usage Buddy

A small always-on-top widget for Windows that shows your Claude 5-hour and weekly usage,
with an animated pixel Avalon guardian, his sidekick Clawd, and an iron guard that turns
up as your limits get closer.

## Install (once)

1. Install Node.js (https://nodejs.org) if you don't have it.
2. Unzip this folder somewhere permanent, e.g. `C:\Tools\claude-usage-buddy`.
3. Open a terminal in the folder and run:

       npm install
       npm run setup

   `setup` points Claude Code's status line at `statusline.js`. It backs up your
   `~/.claude/settings.json` first, and if you already have a status line it keeps it.
4. Double-click `start-widget.bat` (or run `npm start`).
5. Restart Claude Code and send a message. The bars fill in after the first reply.

Run `npm run demo` to watch every animation with fake numbers.

## Using it

- Drag the panel anywhere; it remembers its position.
- Click the guardian, Clawd or a soldier to say hi. Right-click the scene, or the tray icon, for options:
  always on top, start with Windows, live polling, quit.

## Where the numbers come from

Claude Code hands its status line script a `rate_limits` object (5-hour and 7-day
`used_percentage` and `resets_at`) after each response. `statusline.js` saves that to
`~/.claude/usage-widget.json` and the widget reads the file. This is the documented route,
but it only updates while you are using Claude Code, and needs a Pro or Max plan.

"Live polling" in the menu instead asks `api.anthropic.com/api/oauth/usage` every 5 minutes
using the login token Claude Code stores in `~/.claude/.credentials.json`. That also covers
usage from the Claude apps, but the endpoint is undocumented and may stop working, so it is
off by default. The token never leaves your machine except to Anthropic.

## If the bars stay empty

The footer says what's wrong; hover it for details.

| Footer | Meaning | Fix |
|---|---|---|
| needs terminal Claude Code | No status line data yet. The Claude desktop app's Code tab never runs status lines. | Send a message in Claude Code in a terminal (`npm install -g @anthropic-ai/claude-code`, then `claude`). |
| not set up · npm run setup | `~/.claude/settings.json` doesn't point at `statusline.js`. | Run `npm run setup`, restart Claude Code. |
| live: no terminal login | Live polling is on but `~/.claude/.credentials.json` doesn't exist (the desktop app keeps its own login). | Run `claude` in a terminal and log in once. |
| live: login expired | The saved login ran out; only terminal Claude Code renews it. | Open terminal Claude Code once. |
| live: offline / HTTP … | The unofficial endpoint couldn't be reached or refused. | It retries every 5 minutes. |

## What the pets do

| Situation | Guardian | Clawd | Iron guard |
|---|---|---|---|
| Normal | idles, patrols with cape fluttering, looks around, hops, practises sword drills | scuttles after him; types in a tiny terminal, juggles a token, dances, blows bubbles, chases a firefly, or hops onto his helmet and rides along | – |
| 5h at 60%+ or week at 75%+ | salutes the sentry when it arrives | | a sentry patrols behind them, looking around |
| Usage went up | catches a gold token | catches a smaller token, chomps it | |
| 5h at 80%+ or week at 90%+ | a red storm rains limit bolts; he runs into position, raises his shield and takes the hits | huddles behind him, flinching at each hit | two soldiers march in and form a shield wall |
| 5h at 90%+ or week at 95%+ | the storm gets heavier | | a third soldier shields Clawd |
| A limit hit 100% | knocked out, seeing stars | flipped on its back, legs kicking | knocked flat, spears dropped |
| 5-hour window reset | confetti party | bounces and cheers | cheer, then march home |
| No updates for 15 min | sleeps beside his planted sword | curls up next to the sword | one keeps night watch, nods off, jolts awake |
| You click it | raises his sword with a glint | jumps for joy with a heart | salutes |

The guardian's visor eyes glow green, amber or red to match the bars. No bolt ever gets past him to Clawd.

## The world

- **Time of day** follows your clock: dawn, day (sun, clouds, grass), dusk, and night (moon, stars).
- **Weather** changes every 7–15 minutes: clear, rain or snow (snow is likelier in winter).
- **Random events** every 3–7 minutes while things are calm (or everyone's asleep). Right-click → *Start a random event* to see one now.

| Event | What happens |
|---|---|
| Earthquake | the scene shakes, rocks tumble down; Clawd wobbles with claws up |
| Meteor shower | shooting stars, then a big one lands beyond the hills; Clawd cheers |
| Slime invasion | three slimes hop in; the guardian steps up and bashes each away with his shield, then salutes |
| Dragon | a dragon flies over breathing fire; the guardian raises his shield, Clawd ducks, soldiers brace |

A real change in usage (a siege, a limit hit) always takes over from an event.
