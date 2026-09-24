# Security Policy

ShareGuard is a privacy-focused MVP. Treat it as a research and portfolio project, not as a security boundary.

## Reporting a security issue

Please do not open a public issue for a vulnerability that could expose credentials, payment data, or other sensitive information.

Use GitHub's private vulnerability reporting for this repository when available. If that is not available, contact the repository owner privately.

Include:

- the affected ShareGuard version or commit;
- browser and operating system;
- a minimal reproduction using fictional data;
- what an audience could see that should have been hidden;
- whether the issue occurs during capture, navigation, detection, or rendering.

## Sensitive data rules

Never commit or attach:

- real passwords, API keys, access tokens, cookies, or private keys;
- real payment-card numbers or banking details;
- private screenshots or recordings containing personal information;
- browser profiles, session data, or exported credentials.

Use only fictional test data in issues, tests, screenshots, and demos.

## Privacy invariants

Changes should preserve these rules unless a design proposal explicitly changes the privacy model:

1. The source browser tab is not modified to create the audience mask.
2. Supported detection and rendering run locally in the MVP.
3. Detected secret values are not intentionally logged, persisted, or transmitted.
4. During source navigation or scanner recovery, the audience view should fail closed rather than intentionally display a newly unchecked frame.
5. Manual blackout regions affect only the protected audience output.

## Scope and limitations

ShareGuard cannot guarantee detection of every sensitive value. Browser chrome, built-in PDF viewers, images, video, canvas content, inaccessible cross-origin frames, and unusual secret formats may not be inspectable by the current MVP.

Do not rely on ShareGuard to protect real credentials or financial information.
