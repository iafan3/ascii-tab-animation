# ASCII Tab Background Animation for Zen Browser

Interactive ASCII background for a transparent Zen Browser vertical tab bar. It reacts to mouse drag and click.

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
