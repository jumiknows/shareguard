# GitHub Governance

ShareGuard uses a lightweight version of the workflow used on larger engineering projects. The goal is to keep the repository easy to understand without adding process for its own sake.

## Source of truth

- GitHub Issues: bugs, feature ideas, investigations, and roadmap work.
- GitHub Pull Requests: implementation discussion, review, and validation.
- `main`: the stable portfolio/demo branch.

## Branches

Use short-lived branches from the latest `main`:

- `feat/short-description`
- `fix/short-description`
- `docs/short-description`
- `test/short-description`
- `refactor/short-description`
- `ci/short-description`
- `spike/short-description`

If the work has an issue, include the issue number when useful, for example `fix/42-navigation-recovery`.

## Pull requests

Keep one logical change per pull request. A PR should explain:

- what changed;
- why the change is needed;
- how it was tested;
- privacy or security implications;
- known limitations or follow-up work.

Prefer Conventional Commit-style PR titles such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, or `ci:`.

## Recommended `main` ruleset

For a public portfolio repository, use a simple protected-trunk setup:

- require a pull request before merging;
- require conversation resolution;
- require CI checks;
- require linear history;
- block force pushes;
- restrict deletion of `main`;
- prefer squash merge;
- automatically delete merged branches.

A mandatory second-person approval is useful when collaborators are active, but it is not required for a solo portfolio project.

## Required checks

The initial required check should be the repository CI workflow, which validates JavaScript syntax, deterministic tests, and Chromium smoke tests.

## Releases

Tag demo-ready milestones using semantic versions such as `v0.8.0`. A release should describe what is working, what changed, and what remains experimental.

## Privacy review

Any change to capture, scanning, detection, masking, recording, permissions, or remote communication should receive an explicit privacy review in the PR description.
