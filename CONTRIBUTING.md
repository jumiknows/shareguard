# Contributing

ShareGuard is an MVP/POC, so the workflow is intentionally lighter than a production team repository while still keeping changes reviewable and safe.

## Before starting

Use a GitHub Issue for bugs, meaningful features, or investigations. Small documentation fixes do not need an issue.

Create a short-lived branch from the latest `main`, for example:

- `feat/custom-detection-rules`
- `fix/navigation-recovery`
- `docs/architecture`
- `test/renderer-regression`
- `spike/ocr-evaluation`

## Development flow

1. Start from the latest `main`.
2. Keep one logical change per branch and pull request.
3. Add or update tests for behavior you change.
4. Run `npm run check`.
5. Run the Chromium smoke tests for capture, scanning, rendering, or navigation changes.
6. Open a pull request and document privacy/security implications.
7. Prefer squash merge after CI passes.
8. Delete the merged branch.

## Pull requests

Use Conventional Commit-style titles such as:

- `feat: add configurable token patterns`
- `fix: recover scanner after navigation`
- `docs: document capture trust boundary`
- `test: cover privacy hold regression`

A pull request should explain what changed, why, how it was validated, privacy/security implications, and any limitations that remain.

## Privacy rules

1. Keep detection local unless a proposal explicitly changes the privacy model.
2. Do not log, persist, or transmit detected secret values.
3. Use fictional data in tests, screenshots, recordings, and issues.
4. Preserve fail-closed navigation behavior when working on recovery paths.
5. Do not describe probabilistic or heuristic detection as a guarantee.

## Security and data handling

Never commit real passwords, API keys, payment data, cookies, browser profiles, private recordings, `.env` files, certificates, or private keys.

See [`SECURITY.md`](SECURITY.md) before changing capture, permissions, detection, rendering, recording, or any future remote-processing feature.
