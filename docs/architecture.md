# Architecture

ShareGuard keeps the presenter's tab separate from the audience view.

## Data flow

1. Chrome captures the selected browser tab.
2. The page scanner checks visible DOM text and fields.
3. The detector returns the sensitive text spans.
4. The scanner converts those spans into screen coordinates.
5. Studio draws the captured frame to a canvas.
6. Studio covers the detected and manual regions.
7. Only the protected canvas is intended for the audience.

## Components

### `background.js`

Opens Studio, manages the selected source tab, requests tab capture and reinstalls the scanner after full page navigation.

### `scanner.js`

Runs inside supported webpages. It inspects visible DOM content and returns mask rectangles.

The scanner does not edit the webpage.

### `detector.js`

Contains the deterministic rules for password values, known token formats and payment card candidates.

### `studio.js`

Owns the protected preview. It copies captured frames to a canvas, applies masks, handles manual blackouts and can record the protected result.

## Navigation

A full page navigation destroys the old content script.

ShareGuard notices the navigation and puts the audience canvas into a privacy hold. The scanner is installed in the new document. Protected frames resume only after the new page can be checked.

## Trust boundary

The protected canvas is the intended audience output.

The original browser tab is never considered safe to share directly.

## Current gaps

The DOM path cannot inspect text inside images, video, canvas content, many PDFs, browser chrome or inaccessible frames.

Future detection should preserve the same local-first privacy model.
