# aketch.ie — interface update

This package contains the complete website, including the original photographs, papers and icons, with the supplied newer design used as the starting point.

## Follow-up: native sliders and Research

- SHRED moved intact from the homepage into Research, after the regime simulator. Equations, copy controls, speech, reactive terms and 2D/3D graphs are retained.
- SHRED sliders now use the browser/OS native range control, matching the Research simulator. Custom track/thumb painting has been removed.
- Homepage and search links point to the new location; old homepage SHRED links redirect. Updated CSS/JS URLs avoid reuse of the preceding asset versions.

## Changes

- Responsive layouts and controls checked from 320px through desktop; improved translucent surfaces, typography, touch targets and mobile accessibility panel.
- GPU-rendered AmC orbital graphic with lighting, drag/keyboard rotation, reactive mode buttons and an SVG fallback.
- Photography darkroom transition, soft exposure bloom and red safelight pointer effect that preserves the photographs' colours.
- Photography enquiry form with review, validation, retained input on failure and genuine backend-confirmed success. Private email delivery is implemented in `backend/`.
- Mathematics terms respond to pointer hover, keyboard focus and touch. Related sliders highlight, controls have clearer feedback, and the Student-t plot offers an interactive 3D distribution surface alongside its 2D view.
- Page/theme transitions, supported scroll-driven effects, opt-in read-aloud controls and optional voice search. Unsupported browser features have simpler fallbacks.
- Fixed Photography's accessibility-panel variable collision, misleading clipboard announcements and repeated focus effects; reduced unnecessary animation work and moved embedded maths fonts into cached assets.

## Use the files

Merge this folder's contents into the website repository and review the changes. Keep the `assets`, `photos` and `papers` folders alongside the HTML files. Preview through an HTTP server rather than opening `file://` URLs; for example, run `python3 -m http.server 8000` from this folder.

The booking backend is included but is **not deployed or connected**. GitHub Pages cannot run it. Follow `backend/README.md` to configure the server-only email credentials, deploy the Worker and set the form endpoint. Until connected, submissions show a failure and preserve the visitor's details; they do not claim a booking succeeded. No real email was sent during testing.

## Verification

- Checked five pages in Chromium at 320, 390, 768 and 1440px, with no horizontal page overflow or JavaScript errors.
- Checked command-palette navigation, maths controls, 2D/3D switching and rotation, graphics-unavailable fallbacks, larger text and reduced-motion behaviour.
- Exercised booking failure/retry/success using mocked responses and verified retry idempotency.
- Six backend tests cover validation, configuration, origins, rate limiting and email-provider handling. Run them with `node --test backend/worker.test.mjs`.

These are local browser and mocked-backend checks. Real-device Safari/Firefox, microphone permissions, system voices, production email delivery and GPU performance still need checking in the deployed environment. Reduced motion and static alternatives are provided.
