# Contributing

Keep changes small enough to review and test.

## Setup

Load `extension/` as an unpacked Chrome or Edge extension.

Run the fast checks before opening a pull request:

```bash
npm run check
```

For capture, rendering, scanning or navigation changes, also run:

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:browser
```

## Workflow

1. Start from the latest `main`.
2. Create a short branch such as `fix/navigation-recovery`.
3. Make one focused change.
4. Add or update tests.
5. Run the relevant checks.
6. Open a pull request.
7. Delete the branch after merge.

## Privacy rules

- Do not log, save or transmit detected secret values.
- Use fictional data in tests, screenshots and issues.
- Keep the audience view private while a new page is still being checked.
- Do not describe heuristic detection as a guarantee.
- Treat any new network request involving page content as a privacy design change.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and sensitive data rules.
