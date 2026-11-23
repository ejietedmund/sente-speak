# Accessibility notes

Target: WCAG 2.2 AA. This document records what is implemented and what still needs manual
verification with real users and assistive technology.

## Implemented

### Keyboard and focus

- All controls are native `button`, `a`, `select`, `input` or `label` elements.
- Visible 4px focus indicator with offset via `:focus-visible`.
- Logical DOM/tab order; skip link to `#main-content`.
- No keyboard traps; camera overlay and processing states expose explicit cancel/dismiss actions.
- Large minimum control height (3.5rem) and spacing between actions.

### Screen readers

- Semantic landmarks: `header`, `nav aria-label="Main navigation"`, `main`, `section`, headings.
- Single `h1` per screen; cards reference headings with `aria-labelledby`.
- Two live regions: polite `role="status"` for results/progress, assertive `role="alert"` for errors.
- Speech outcomes (including failures and fallback voice use) are announced in the live regions.
- Camera preview has an `aria-label`; decorative icons are `aria-hidden`.
- Uncertain results state explicitly that no denomination was selected.
- Language selector is a labelled `select` with a visible description.

### Visual

- Warm off-white background, deep navy primary, restrained green success, amber warning, red error.
- Text and icons are never the only signal; every status has a text label.
- High-contrast mode replaces the palette with black/white/strong outlines.
- Text size control scales the whole interface with rem units (100% / 112.5% / 125%).
- Reduced-motion setting and `prefers-reduced-motion` media query.
- Responsive layouts from mobile to desktop; buttons stack on narrow screens.

### Audio

- Results are spoken automatically when speech is enabled.
- Replay button on the result screen; "Test speech" in Settings.
- Repetition setting (1–3 times) chains utterances; new speech cancels prior speech and timers.
- Detect `speechSynthesis` availability and voices; report fallback/no-voice states.
- Never report successful playback after a failure.
- Luganda and Ateso use explicit placeholder translations with English fallback and notice.

### Error prevention and recovery

- Camera permission is requested only after opening the Scan screen.
- Image format and size validated client-side and server-side.
- Preview and replace/remove before upload recognition.
- Error messages include actionable next steps; no automatic destructive actions.
- Model-not-configured state disables recognition actions and explains how to fix it.

## Checks performed

- `npm run lint` includes `eslint-plugin-jsx-a11y` recommended rules.
- `npm test` includes a test for labelled primary controls on the home screen.
- `npm run typecheck` and `npm run build` pass.
- Keyboard traversal and browser zoom were reviewed in the implementation.

## Manual checks still recommended before deployment

1. Keyboard-only end-to-end run: home → camera or upload → result → replay → home.
2. Screen reader pass (NVDA/Firefox and VoiceOver/Safari): verify announcements and live regions.
3. Zoom to 200% and 400%; confirm reflow and no clipped controls.
4. Enable high contrast, large text and reduced motion; verify all screens.
5. Deny camera permission, unplug camera, and use a corrupted file; verify recovery messages.
6. Test with a device whose speech synthesis has no Luganda or Ateso voice.
7. Validate with people with visual impairments; WCAG conformance cannot be claimed from code review alone.
