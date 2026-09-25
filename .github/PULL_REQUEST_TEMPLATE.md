## Problem

What privacy, capture, masking, navigation, permission, or reliability problem does this address?

Describe the failure mode or user-visible risk before the solution.

## Approach

What changed, and why was this design chosen?

Explain browser API, frame, recovery, permission, storage, or threat-model decisions when relevant.

## Verification

### Automated

List unit, DOM, renderer, navigation, or other checks you ran.

### Browser scenarios

Describe the browser, page state, steps, expected result, and observed result for behavior that depends on Chromium.

### Security or privacy evidence

If the change affects masking or data exposure, state what sensitive information was tested and confirm that fictional data was used.

## Risks and limitations

What can still bypass detection, fail during navigation, behave differently across browsers, or expose information?

## References

Link relevant browser API documentation, security guidance, threat-model notes, or prior issues that support the implementation.

## Checklist

- [ ] Fictional data was used for tests, screenshots, and recordings.
- [ ] `npm run check` passes.
- [ ] Browser smoke tests cover behavior I changed.
- [ ] No secrets, browser profiles, or private recordings are committed.
- [ ] New frames still fail closed on the recovery paths I touched.
