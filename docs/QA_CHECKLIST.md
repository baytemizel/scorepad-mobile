# ScorePad — QA Checklist

Run through this end-to-end on **at least one physical iOS device** and **one physical Android device** before every release.

## Smoke test (5 min)

- [ ] App launches without a white-flash splash
- [ ] Onboarding appears on a fresh install
- [ ] Onboarding can be completed both as Guest and as registered user
- [ ] Home shows all 5 sports + history link
- [ ] Tapping a sport opens setup, "Start Match" opens scoring screen
- [ ] Scoring screen forces landscape automatically
- [ ] Returning to Home restores portrait

## Sport-specific scoring

### Basketball
- [ ] +1, +2, +3 buttons all work
- [ ] Score reflects exact action (e.g. +2 increments by 2, not 1)
- [ ] Period progression works correctly with selected period count (2 or 4)
- [ ] Undo reverses last action
- [ ] Status label shows "Quarter X of Y"

### Football
- [ ] Goal +1 only (no big numbers in football)
- [ ] Two halves transition correctly
- [ ] Final score determines winner correctly
- [ ] Draw shown when scores equal at full time

### Volleyball
- [ ] Single +1 button per side
- [ ] First to 25 with 2-point lead wins set
- [ ] Deciding set (3rd of best-of-3, 5th of best-of-5) ends at **15** points
- [ ] Set count increments visually
- [ ] Match ends when one team wins majority of sets
- [ ] Best-of-5 mode requires 3 set wins

### Tennis
- [ ] Points cycle 0 → 15 → 30 → 40 → game
- [ ] Deuce state shows correctly at 40-40
- [ ] Advantage / Deuce transitions work
- [ ] Game count increments after game won
- [ ] Tiebreak triggers at 6-6 in a set
- [ ] Tiebreak winner needs 7+ points with 2-point lead
- [ ] Set count increments after set won
- [ ] Best-of-3 / best-of-5 selection respected
- [ ] Tennis displays games as the big number, points + sets as stats

### Table tennis
- [ ] First to 11 with 2-point lead wins set
- [ ] At 10-10, points alternate service every point (deuce service)
- [ ] Below 10-10, service rotates every 2 points
- [ ] Service indicator shows correctly under each player
- [ ] Service swaps between sets
- [ ] Best-of-3, 5, or 7 supported

## Undo & finish flow

- [ ] Undo reverts the most recent scoring event
- [ ] Multiple undos work in sequence
- [ ] Undo button is disabled when no events exist
- [ ] Finish prompts a confirmation alert
- [ ] After finish, end-of-match overlay appears with winner / draw
- [ ] Whistle sound plays on match end (if enabled)
- [ ] Confetti or celebration animation runs on match end

## Match history

- [ ] As **guest**: history screen shows premium gate
- [ ] As **free signed-in user**: history screen shows premium gate
- [ ] As **premium**: history shows saved matches
- [ ] Search by team name filters list
- [ ] Sport filter chips work
- [ ] Long-press shows delete confirmation
- [ ] Delete removes from local + cloud (premium signed-in)

## Premium / IAP

- [ ] Premium screen shows price fetched from store (not hardcoded)
- [ ] Buy button starts native purchase flow
- [ ] After purchase, ads disappear and history unlocks
- [ ] Restore purchases recovers Premium on a reinstall
- [ ] Restore on a fresh device that has not bought shows "no purchases" message

## Auth

- [ ] Email sign-up creates a new Firebase account
- [ ] Email sign-in with valid credentials succeeds
- [ ] Wrong password shows the right error message
- [ ] iOS: Apple's button sits directly below Google on both the onboarding and the sign-in screen, same width and height
- [ ] iOS: on an iPhone SE-sized screen the Apple button is visible without scrolling
- [ ] Android: no Apple button on either screen
- [ ] Apple Sign-In with "Share My Email" creates an account; Settings shows that email
- [ ] Apple Sign-In with "Hide My Email" works; Settings shows the `privaterelay.appleid.com` address
- [ ] Signing in with Apple again lands in the same account (cloud history and Premium come back)
- [ ] Closing the Apple or Google sheet shows no error
- [ ] Apple/Google sign-in with an email already registered through another method shows the "different sign-in method" message
- [ ] Google Sign-In works on both platforms
- [ ] Sign Out from Settings returns to sign-in
- [ ] After sign-out, guest mode is cleanly available again

## Account deletion

- [ ] Settings → Delete account is only shown when signed in, and asks for confirmation (the text says an active subscription isn't cancelled)
- [ ] Apple account: Apple's sheet appears again, then the app returns to sign-in with a "deleted" message
- [ ] Apple account: afterwards ScorePad is gone from iOS Settings → Apple Account → Sign-In & Security → Sign in with Apple
- [ ] Google account: deletion works (re-authentication is silent or shows Google's sheet)
- [ ] Email account: a password prompt appears; a wrong password shows an error and keeps the prompt open
- [ ] The account's `users/{uid}` document and its matches are gone from Firestore, and the user is gone from Firebase Authentication
- [ ] Signing in again with the same Apple ID / Google account starts a fresh, empty account
- [ ] Offline: deletion shows an error and the account stays intact

## Settings

- [ ] Language change is immediate and persists across launches
- [ ] All 15 languages display without missing keys
- [ ] Arabic and Hebrew apply RTL layout (after restart, per the notice)
- [ ] Theme: Light / Dark / System all work
- [ ] System theme follows OS-level setting changes
- [ ] Sound toggle silences score / whistle sounds
- [ ] Haptics toggle disables vibration on score
- [ ] Privacy and Terms screens render without crash
- [ ] Restore Purchases from Settings works the same as from Premium screen

## Ads

- [ ] Banner ads show on Home, Setup, Post-match (free users only)
- [ ] No banner shows during live scoring (clean UI)
- [ ] Interstitial appears after a match ends, ~1.5s after the overlay
- [ ] No ads at all for Premium users
- [ ] On iOS, App Tracking Transparency dialog appears once on first launch

## Edge cases

- [ ] Killing the app mid-match does NOT restore the in-progress match (intentional)
- [ ] Killing the app while signed in keeps you signed in
- [ ] Network offline: app still launches, scoring works, sync queues silently
- [ ] Switching language mid-app applies on next screen render
- [ ] Switching theme mid-match doesn't crash the score screen
- [ ] Rotating device on portrait screens does NOT trigger landscape (lock holds)
- [ ] Backgrounding mid-match and returning works without orientation glitches
- [ ] Very long team names (24 chars) don't break layout
- [ ] Very high scores (e.g. 999) still fit in the BigScore component

## Accessibility

- [ ] Tap targets ≥ 44×44 pt on iOS / 48×48 dp on Android
- [ ] VoiceOver / TalkBack reads team names + scores
- [ ] Dynamic type / large fonts don't break layout (we use `allowFontScaling={false}` on the score number itself, intentionally)
- [ ] Sufficient contrast in both light and dark themes
- [ ] No flashing animations at >3Hz (epilepsy guideline)

## Localization spot-check

For each of: en, tr, de, fr, es, it, pt, sr, el, ru, et, sv, fi, ar, he

- [ ] Onboarding strings render
- [ ] Setup screen labels render
- [ ] Sport names + actions render
- [ ] Status labels with `{{current}} / {{total}}` interpolate correctly
