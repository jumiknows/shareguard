# Architecture

ShareGuard keeps the host view and audience view separate.

```text
Source browser tab
      |
      | tabCapture
      v
ShareGuard Studio -------------------------+
      |                                    |
      | asks content script for geometry   | video frames
      v                                    v
DOM scanner -> deterministic detector -> protected canvas
                                           |
                                           v
                                  audience preview / recording
```

## Components

### `background.js`

Owns extension-level orchestration. It opens Studio, requests tab capture, validates the selected source tab, and helps recover the scanner after same-tab navigation.

### `scanner.js`

Runs as a content script on supported web pages. It inspects visible DOM content and returns rectangles for regions that should be masked. It does not modify the source page to create the audience view.

### `detector.js`

Contains narrow, deterministic rules for the MVP. Current targets include password-like fields, recognizable API-token formats, and payment-card candidates that pass the Luhn checksum.

### `studio.js`

Consumes the tab video stream, paints frames to a canvas, applies automatic and manual masks, handles privacy holds during navigation, and can record the protected canvas output.

## Trust boundary

The protected canvas is the output intended for an audience. The original source tab remains visible to the host and must not be treated as safe to share directly.

## Fail-closed navigation

Navigation destroys the previous page's content-script context. ShareGuard listens for source-tab navigation, places the audience preview into a privacy hold, reconnects the scanner on the new document, and resumes only after the new page can be inspected.

## Current limitations

The DOM scanner cannot inspect every rendered pixel. Images, browser chrome, many PDFs, canvas/video content, inaccessible cross-origin frames, and unsupported browser pages require a different detection path. OCR and broader classifiers are roadmap items, not part of the current privacy guarantee.
