# Marketing assets — sourcing guide

The SVGs in `public/images/` and `public/videos/` are stand-ins so the light-theme pivot has real visual anchors. Replace them with the photos / video below in roughly the order shown — each filename in `public/images/` is already wired up to a specific page slot, so a one-for-one swap is all you need.

All recommended sources are royalty-free for commercial use (Unsplash and Pexels licenses), but double-check attribution requirements for any individual photo before shipping.

---

## Tier 1 — biggest impact

### `images/hero-salon.svg` → centerpiece lifestyle shot

Warm-lit salon, stylist + client at chair, mirror in frame. Pick a 16:9 crop, ~2400px wide.

- Unsplash searches:
  - https://unsplash.com/s/photos/salon-interior
  - https://unsplash.com/s/photos/hairdresser-working
  - https://unsplash.com/s/photos/hair-salon
- Filter: landscape orientation, warm color tones.
- Keep eyes / faces partially turned (less stock-y, more aspirational).

### `images/product-mirror.svg` → the LUX product itself

Tall premium full-length mirror, thin bezel, on a salon wall. Stand-in is fine until the real render lands.

- Unsplash searches:
  - https://unsplash.com/s/photos/full-length-mirror
  - https://unsplash.com/s/photos/standing-mirror
  - https://unsplash.com/s/photos/mirror-minimalist
- AI render prompt (Midjourney / DALL-E):
  > "minimalist full-length smart mirror with thin matte-black bezel mounted on a warm cream salon wall, soft tungsten lighting, subtle reflection of a stylist's chair, photorealistic, shallow depth of field, 3:4 portrait"

---

## Tier 2 — feature sections

### `images/ar-styling.svg` → AR preview moment

Close-up of a client looking into the mirror, ideally half-profile; or a stylist holding a tablet showing the preview.

- Unsplash searches:
  - https://unsplash.com/s/photos/woman-mirror-salon
  - https://unsplash.com/s/photos/stylist-tablet
  - https://unsplash.com/s/photos/hair-color-consultation

### `images/hands-gesture.svg` → craft / control

Stylist's hands working, scissors and comb, or a soft gesture near a mirror surface.

- Unsplash searches:
  - https://unsplash.com/s/photos/hair-scissors-hands
  - https://unsplash.com/s/photos/barber-hands
  - https://unsplash.com/s/photos/hands-gesture-mirror

### `images/fleet-salon.svg` → multi-location / fleet

Wide salon interior — row of chairs / stations / mirrors that reads as "more than one chair."

- Unsplash searches:
  - https://unsplash.com/s/photos/salon-stations
  - https://unsplash.com/s/photos/barbershop-row
  - https://unsplash.com/s/photos/empty-salon

---

## Tier 3 — testimonial portraits

5 head-and-shoulders shots, diverse, warm, professional. Each placeholder is square (1:1, ~600px) — match that crop on swap.

| Slot | Suggested vibe | Search |
|---|---|---|
| `stylist-1.svg` | long dark wavy hair, warm smile | https://unsplash.com/s/photos/hairstylist-portrait |
| `stylist-2.svg` | deep skin tone, clean fade | https://unsplash.com/s/photos/barber-portrait |
| `stylist-3.svg` | blonde, tied back, light apron | https://unsplash.com/s/photos/salon-owner |
| `stylist-4.svg` | side-swept undercut, editorial | https://unsplash.com/s/photos/hair-artist |
| `stylist-5.svg` | salt-and-pepper, seasoned pro | https://unsplash.com/s/photos/senior-stylist |

Try to avoid the "five identical headshots from one shoot" trap — varied backgrounds and lighting make the testimonial wall feel real.

---

## Bonus — hero video loop

### `videos/hero-loop-poster.svg` → swap with `videos/hero-loop.mp4`

A 10–30 second muted autoplay loop is the single move that separates "polished" from "premium." Keep the poster SVG as the `poster` attribute so there's no flash before the video boots.

- Pexels video searches:
  - https://www.pexels.com/search/videos/salon/
  - https://www.pexels.com/search/videos/barber/
  - https://www.pexels.com/search/videos/hairdresser/
- Target spec: 1920×1080, H.264, < 6 MB, no audio, seamless loop point.
- Bias toward slow camera movement (dolly / slider) and warm tungsten light. Avoid clips where the camera cuts.

---

## Suggested HTML wiring

```html
<!-- Hero -->
<section class="hero">
  <video
    class="hero__video"
    poster="/videos/hero-loop-poster.svg"
    autoplay muted loop playsinline
  >
    <source src="/videos/hero-loop.mp4" type="video/mp4" />
  </video>
  <img class="hero__fallback" src="/images/hero-salon.svg" alt="" />
  <!-- copy overlay -->
</section>

<!-- Product -->
<img src="/images/product-mirror.svg" alt="LUX full-length smart mirror" />

<!-- Feature blocks -->
<img src="/images/ar-styling.svg"   alt="Live AR style preview on the LUX mirror" />
<img src="/images/hands-gesture.svg" alt="Stylist controlling LUX hands-free" />
<img src="/images/fleet-salon.svg"   alt="LUX across every chair in your salon" />

<!-- Testimonials -->
<img src="/images/stylist-1.svg" alt="Stylist headshot" />
<!-- …through stylist-5.svg -->
```

All filenames match the placeholders exactly, so when real assets land you can drop them in (same name, replace `.svg` with `.jpg`/`.webp`/`.mp4` and update the `src` extension).
