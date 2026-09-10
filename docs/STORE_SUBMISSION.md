# Store Submission Checklists

## Apple App Store

### App Store Connect setup

1. Create the app at https://appstoreconnect.apple.com (Bundle ID: `com.oditteknoloji.scorepad`).
2. **App Information** — Category: Sports (Primary), Utilities (Secondary).
3. **Pricing** — Free with in-app purchase.
4. **In-App Purchases** — create a non-consumable:
   - Product ID: `com.oditteknoloji.scorepad.premium`
   - Reference name: "ScorePad Premium"
   - Price: $2.99 (Tier 3) — duplicate to all 175 territories.
   - Localized name + description in all 15 supported languages.
   - State must be **"Ready to Submit"** before review.
5. **App Privacy** — declare:
   - Data linked to user: Email, Purchase history (sync only)
   - Data not linked: Crash data, Performance data, Product interaction (analytics)
   - Data used to track you: Device ID (for ads, only if user grants ATT)
6. **Age Rating** — 4+.
7. **App Review Information**:
   - Demo account: provide test credentials for email auth.
   - Notes: "Multi-sport score tracker. Premium IAP unlocks match history, removes ads, and enables cloud sync."

### Required assets (per locale)

| Asset                  | Size                    | Notes                          |
|------------------------|-------------------------|--------------------------------|
| App Icon               | 1024×1024 PNG, no alpha | Provided in `assets/icon.png`  |
| iPhone 6.7" screenshots| 1290×2796               | At least 3, max 10             |
| iPhone 6.5" screenshots| 1284×2778 / 1242×2688   | Optional but recommended       |
| iPad 12.9" screenshots | 2048×2732               | Required if iPad supported     |

### Required text fields (English first, then localize)

- **App Name**: ScorePad
- **Subtitle** (30 chars): Multi-sport scoreboard
- **Promotional Text** (170 chars): see `store-assets/ios/description.md`
- **Description** (4000 chars): see `store-assets/ios/description.md`
- **Keywords** (100 chars): see `store-assets/ios/description.md`
- **Support URL**: https://scorepad.best/support
- **Marketing URL**: https://scorepad.best
- **Privacy Policy URL**: https://scorepad.best/privacy

### Common rejection reasons to avoid

- ❌ App lets a guest use Premium features → **fixed**: history & cloud sync are gated.
- ❌ Sign in with Apple missing on iOS while other social providers are offered → **fixed**: Apple sign-in is on the iOS sign-in screen.
- ❌ Restore Purchases missing → **fixed**: present in Settings + Premium screens.
- ❌ Misleading IAP price → ensure price displayed in app comes from `fetchPremiumProduct()`, never hardcoded.
- ❌ Tracking without ATT prompt → **fixed**: `initializeAds` requests permission on iOS.

---

## Google Play Console

### Console setup

1. Create the app at https://play.google.com/console (Package: `com.oditteknoloji.scorepad`).
2. **App content**:
   - Privacy policy URL: https://scorepad.best/privacy
   - Ads: **Yes, app contains ads**
   - Data safety: declare same as iOS App Privacy (above)
   - Target audience: 13+ (Sports category, no kid-focused features)
   - Content rating: complete the IARC questionnaire (expect "Everyone")
3. **Monetization → Products → In-app products**: create `com.oditteknoloji.scorepad.premium` (non-consumable, $2.99).
4. **Monetization → Subscriptions**: leave empty.
5. **Store listing** — see `store-assets/android/description.md` for copy.

### Required assets (per locale)

| Asset                | Size                 | Notes                                   |
|----------------------|----------------------|-----------------------------------------|
| App Icon             | 512×512 PNG          |                                         |
| Feature graphic      | 1024×500 PNG/JPG     | Required                                |
| Phone screenshots    | 16:9 or 9:16, ≥320px | At least 2                              |
| Tablet screenshots   | 7" + 10"             | Required if "Designed for tablets" flag |

### Release tracks

1. **Internal testing** first — invite your QA list.
2. **Closed testing** with at least 12 testers for 14 days (required for new accounts after Nov 2023).
3. Promote to **Production** when ready.

### Play-specific gotchas

- The Play Console expects `targetSdk = 35` (API level 35, Android 15) as of Aug 2025 → already set.
- All native libraries must be 64-bit — Expo handles this.
- Account type "Individual" requires you to disclose your home address publicly. Consider an Organization account if avoidable.

---

## Pre-submission QA

Before tapping "Submit for Review" on either store, run through `docs/QA_CHECKLIST.md` end-to-end on at least one physical iOS device and one physical Android device.
