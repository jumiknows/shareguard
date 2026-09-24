<p align="center">
  <img src="extension/icons/icon128.png" alt="ShareGuard icon" width="96" />
</p>

<h1 align="center">ShareGuard</h1>

<p align="center"><strong>Privacy-preserving screen sharing for the browser.</strong></p>

<p align="center">
  The presenter keeps the normal webpage. The audience gets a separately rendered view with selected sensitive information hidden.
</p>

<p align="center">
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=111">
  <img alt="Local processing" src="https://img.shields.io/badge/Processing-Local-18A558">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-7C6CF2">
</p>

<p align="center">
  <img src="docs/hero.svg" alt="ShareGuard host and protected audience views" width="100%" />
</p>

## Why ShareGuard?

Screen sharing normally exposes exactly what is visible in the shared source. ShareGuard explores a different model: keep the host's browser untouched while producing a second, privacy-filtered audience view.

The current MVP detects a narrow set of high-confidence secrets in ordinary webpage text and form fields, then draws masks over those locations in a separate captured video stream. Users can also add or remove manual blackout regions when automatic detection is not enough.

## What works today

- **Separate host and audience views.** The original browser tab is not visually modified.
- **Selective automatic redaction.** Password fields, recognizable API-token formats and Luhn-valid payment-card numbers are targeted without hiding unrelated page content.
- **Manual blackouts.** Draw extra regions directly over the protected preview, remove individual regions, undo or clear them.
- **Navigation recovery.** Protection follows the same selected browser tab across ordinary page navigation and temporarily holds the audience view while the new document reconnects.
- **Fail-closed navigation behavior.** During navigation or an unsupported page, ShareGuard shows a privacy placeholder instead of intentionally releasing a newly unchecked frame.
- **Protected recording.** Record the sanitized canvas as a WebM file for demos and QA.
- **Local-only MVP.** No cloud service, Python process, remote classifier or model download is required at runtime.

## Architecture

```text
Browser tab (host view remains unchanged)
                 |
                 v
       DOM geometry scanner
                 |
                 v
       Sensitive-region rules
                 |
                 v
       Protected canvas renderer
                 |
                 v
       ShareGuard audience view
```

The content script returns **geometry**, not a modified page. Studio captures the selected tab, copies each frame into a canvas, applies the current mask rectangles and exposes only that protected preview for sharing.

## Studio

<p align="center">
  <img src="docs/studio.png" alt="ShareGuard Privacy Studio showing a protected audience preview" width="100%" />
</p>

The interface is intentionally simple: start protection, choose what ShareGuard detects, add manual blackouts when necessary, and share the Studio preview rather than the original tab.

## Install from source

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the `extension/` folder.
5. Open a normal website, click the ShareGuard toolbar icon, then select **Start protection**.
6. Share the **ShareGuard Studio window** in your meeting app, not the original browser tab or entire desktop.

For the included local `demo.html`, enable **Allow access to file URLs** on ShareGuard's extension details page before testing.

## Detection scope

| Category | Current approach |
| --- | --- |
| Passwords | Password-type fields, password-like field metadata, and clearly labeled password values |
| API tokens | Recognized token prefixes, bearer tokens, and clearly labeled key/secret values |
| Payment cards | 13-19 digit candidates that pass the Luhn checksum |
| Anything else | User-drawn manual blackout |

The MVP intentionally favors a small deterministic rule set over broad AI classification. This reduces aggressive over-masking, but it does **not** detect every possible secret.

## Privacy model

ShareGuard's current detector runs locally in the extension. It does not need a backend to classify the supported patterns, and it does not intentionally log or persist detected values.

The project is a proof of concept, not a security boundary. Detection can miss unusual secret formats, and some browser surfaces cannot be inspected by a content script.

## Known limitations

ShareGuard currently does not automatically inspect text inside screenshots, video, canvas content, browser chrome, built-in PDF viewers or inaccessible cross-origin frames. Browser-internal pages such as `chrome://` are unsupported. Opening a completely new tab does not automatically switch the selected source.

Do not rely on this MVP to protect real credentials or financial information. Use fictional values when testing and verify the actual audience output before a demo.

## Project structure

```text
shareguard/
├── extension/              # Installable Manifest V3 extension
├── tests/                  # Unit and Chromium smoke tests
├── docs/                   # Architecture and project artwork
├── .github/workflows/      # CI and PR policy
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## Engineering standards

ShareGuard uses a lightweight protected-trunk workflow adapted from larger team projects: focused branches, reviewed pull requests, automated CI, dependency updates, a security policy, code ownership, and explicit privacy review for capture/detection changes.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [docs/architecture.md](docs/architecture.md), and [docs/github-governance.md](docs/github-governance.md).

## Tests

Run deterministic/unit tests with:

```bash
npm test
```

For browser smoke tests:

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_dom_smoke.py
python tests/browser_renderer_smoke.py
python tests/browser_navigation_smoke.py
```

## Roadmap

The next useful steps are OCR for image/PDF content, stronger local secret classifiers, persistent user-defined rules, better source-tab verification, performance profiling, and controlled WebRTC/virtual-camera output for tighter conferencing integration.

## Status

**MVP / proof of concept.** The protected-stream architecture, precise DOM-based masking, manual blackouts and same-tab navigation recovery are implemented. The project is actively being refined and is not yet intended as a production privacy or security product.

## License

MIT. See [LICENSE](LICENSE).
