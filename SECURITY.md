# Security

ShareGuard is a privacy prototype, not a security boundary.

## Report a problem privately

Do not open a public issue for a bug that could expose credentials, payment data or other sensitive information.

Use GitHub private vulnerability reporting when available. Otherwise contact the repository owner privately.

A useful report includes:

- the affected version or commit
- browser and operating system
- a reproduction using fictional data
- what the audience could see
- whether the problem happened during capture, navigation, detection or rendering

## Never include real sensitive data

Do not commit or attach:

- passwords
- API keys or access tokens
- cookies or private keys
- payment or banking information
- private screenshots or recordings
- browser profiles or exported credentials

Use fictional values for testing.

## Privacy rules

ShareGuard should keep these properties unless a design change explicitly says otherwise:

1. The source tab is not modified to create the audience mask.
2. Supported detection and rendering run locally.
3. Detected values are not intentionally logged, stored or transmitted.
4. Navigation holds the audience view until the new page can be checked.
5. Manual blackouts affect only the protected audience output.

## Limits

The current scanner cannot inspect every rendered pixel. Images, video, canvas content, many PDFs, browser chrome and inaccessible frames can contain text that ShareGuard does not see.

Always verify the protected output before a demo.
