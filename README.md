# ASCII Tab Background for Zen + Sine

Interactive ASCII background for a transparent Zen Browser vertical tab bar. It reacts to mouse drag and click, with subtle blur and varied white glyph opacity:

- Drag inside the vertical tab bar to paint brighter ASCII trails.
- Click inside the vertical tab bar to emit expanding ASCII ripples.
- The canvas is injected behind the sidebar controls with `pointer-events: none`, so tabs remain clickable.

This is a clean-room recreation of the behavior because no target website URL/source was provided.

## Files

```text
ascii-tab-background-sine-mod/
├─ theme.json
├─ chrome.css
├─ ascii-tab-background.uc.js
└─ demo/
   └─ index.html
```

## Local demo

Open `demo/index.html` in any modern browser. Click and drag on the left mock sidebar.

## Sine usage

1. Put this folder in a GitHub repository.
2. In Zen Browser, open Sine Mods.
3. Enable JS from unofficial sources if Sine asks for it.
4. Paste the repository URL into Sine’s install-from-repo box.
5. Enable the mod and restart Zen or clear startup cache if Sine asks.

## Tuning

Edit the top of `ascii-tab-background.uc.js`:

- `targetSelectors`: change which Zen sidebar element receives the canvas.
- `fontSize`, `cellWidth`, `lineHeight`: change ASCII density.
- `idleAlpha`, `activeAlpha`: change visibility.
- `whiteToneMin`, `whiteToneMax`: control the subtle white shade range.
- `chars`: change glyph style.
- `frameMs`: increase to reduce CPU usage.

Edit `chrome.css`:

- `--ascii-tab-bg-opacity`: overall opacity.
- `--ascii-tab-bg-blur`: softens the glyph field slightly.
- `--ascii-tab-bg-dim`: subtle dark veil behind the tab controls.

## Fallback selector note

The script tries these host selectors in order:

```js
["#TabsToolbar", ".zen-workspace-tabs-section", "#navigator-toolbox"]
```

If your Zen theme restructures the sidebar, inspect the browser chrome and replace `targetSelectors` with the actual vertical tab container selector.
