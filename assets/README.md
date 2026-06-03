# Assets

This directory contains static assets used by the app. Some of these files are **placeholders** and should be replaced with final, high-quality versions before shipping to the App Store / Play Store.

## Required files (referenced by `app.config.ts`)

| File                            | Size              | Purpose                       | Status      |
|---------------------------------|-------------------|-------------------------------|-------------|
| `icons/icon.png`                | 1024×1024 PNG     | App icon (no alpha)           | Placeholder |
| `icons/adaptive-icon.png`       | 1024×1024 PNG     | Android adaptive foreground   | Placeholder |
| `images/splash.png`             | 1242×2436 PNG     | Splash screen image           | Placeholder |
| `images/favicon.png`            | 48×48 PNG         | Web favicon (Expo Web only)   | Placeholder |

## Optional sound files

The app gracefully falls back to silence if these are missing. Drop in royalty-free or original audio:

| File                        | Plays when             |
|-----------------------------|------------------------|
| `sounds/score.wav`          | Any scoring action     |
| `sounds/whistle.wav`        | Match end              |

Recommended specs: 16-bit PCM, 44.1 kHz, mono, < 200ms for `score.wav`, < 1s for `whistle.wav`. WAV is preferred over MP3 because Android playback latency is far lower.

## Replacing the icon

Apple requires a **1024×1024 PNG with no transparency, no rounded corners, and no alpha channel**. The system applies the rounded corners. Generate from a logo using:

```bash
# ImageMagick example
magick logo.png -resize 1024x1024 -background "#0B1220" -alpha remove -alpha off icon.png
```

For Android adaptive icons, the foreground (`adaptive-icon.png`) must keep its key content within the inner **66%** safe zone — otherwise it gets cropped by the round / squircle / teardrop masks different OEMs use.

## Splash

We use the Expo splash plugin in `app.config.ts`:

```ts
plugins: [
  ['expo-splash-screen', { image: './assets/splash.png', backgroundColor: '#0B1220' }],
],
```

Image displays centered. Background fills the rest. Keep the splash simple — anything fancy is wasted because the splash flashes briefly.

## Fonts (optional)

If you want a custom font, drop `.ttf` files into `assets/fonts/` and load them via `useFonts` in `app/_layout.tsx`. The current build uses the platform default (San Francisco / Roboto).
