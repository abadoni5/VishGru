# VishGru — Asset Spec for Graphics

Use this spec to create or commission art. All images should match the **warm retro-cartoon** style (bold outlines, flat shading, GDD palette: saffron, teal, off-white, deep brown). Reference `assets/styleGuide.png` for mood.

**Format:** PNG with transparency (no JPG for sprites).  
**Location:** Drop files into `public/images/` (see structure below). The game loads by filename; missing files fall back to colored rectangles.

---

## 1. Gameplay (Play scene)

### Road & environment
| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `road-lane.png` | Single lane strip (repeats vertically) | 200×40 | Warm grey-black tarmac, faded white line; can be a thin slice for tiling |
| `road-stripe.png` | White dash for center stripes | 30×20 | Simple rectangle or rounded |
| (optional) `sky.png` | Top sky strip | 400×80 | Dusty blue-white haze |

### Handlebars (first-person POV)
| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `handlebars.png` | Atlas handlebars + bag on left grip | 320×120 | Viewed from above/slightly front; chrome bars, cloth bag; anchors at bottom center |
| (optional) `handlebars-brake.png` | Same, dipped (braking) | 320×120 | Slight tilt down |
| (optional) `handlebars-left.png` / `handlebars-right.png` | Lane-change tilt | 320×120 | Subtle tilt for animation |

### Obstacles
Place in `public/images/obstacles/`. Each should be **roughly the proportion** below; game scales to fit lane width.

| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `pothole.png` | Dry crater in one lane | 60×45 | Dark patch, repair tar |
| `puddle.png` | Brown muddy puddle | 70×40 | Wet, reflective |
| `cow.png` | White cow, tilak, rope, serene | 90×70 | Unbothered; tail swish can be animated later |
| `scooty.png` | Wrong-way scooty (Activa-style) | 55×40 | Rider optional; grows as it “approaches” |
| `suv.png` | Scorpio/Thar/Creta silhouette or icon | 100×55 | Menacing; can be side view |
| `dog.png` | Brown stray dog | 50×35 | Street-smart, darting |
| `trash.png` | Garbage pile (peels, bags, chair) | 60×45 | One lane |
| `cowpat.png` | Fresh pat in lane | 45×30 | Brown, soft |

### Power-ups
| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `cycling-lane.png` | Green strip with bicycle symbol | 80×50 | Left lane only; optimistic |
| `good-biker-hand.png` | Hand giving push (right side of screen) | 100×80 | Friendly, “Chalo chalo!” moment |

### HUD (optional)
| File | Description | Suggested size |
|------|-------------|----------------|
| `hud-suv-warning.png` | SUV icon + “COMING THROUGH” | 120×40 |

---

## 2. Title screen

| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `title-bg.png` | Full scene: lane, house, door, tulsi, aunty, Atlas | 800×600 or 1200×900 | Golden hour; the “painting that breathes”; can be one composite |
| (or split) `title-house.png`, `title-aunty-cycle.png` | Layered for parallax | — | Optional: separate layers for subtle motion |
| `logo.png` | “VishGru” hand-lettered, saffron/teal | 280×80 | Slightly cracked paint aesthetic |
| `btn-play.png` | “PLAY — VISHWAGURU MODE” button | 320×56 | Wood texture, slight pulse glow |

---

## 3. Game over

| File | Description | Suggested size | Notes |
|------|-------------|----------------|--------|
| `gameover-wheel.png` | Crumpled Atlas wheel in dirt | 200×200 | Spinning slowly |
| (optional) `gameover-bell.png` | Detached bell | 40×40 | Can roll off-screen in animation |

---

## 4. Folder structure

```
public/
  images/
    handlebars.png
    road-lane.png
    road-stripe.png
    obstacles/
      pothole.png
      puddle.png
      cow.png
      scooty.png
      suv.png
      dog.png
      trash.png
      cowpat.png
    powerups/
      cycling-lane.png
      good-biker-hand.png
    title/
      title-bg.png
      logo.png
      btn-play.png
    gameover/
      gameover-wheel.png
```

---

## 5. Integration in code

- The game will **preload** images from `/images/...` on play/title load.
- **Draw order:** road → stripes → obstacles → power-ups → handlebars → AQI overlay.
- **Fallback:** If an image fails to load or is missing, the current colored rectangle is drawn.
- You can add assets **incrementally**; the game will use whatever is available.

Once you have assets (or a subset), place them in `public/images/` as above and run the app; the next step is wiring the loader and `drawImage()` in the code.
