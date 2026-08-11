## Outcome

<!-- What changes for the user or operator? -->

## What changed

<!-- Keep this concrete and scoped. -->

## Verification

- [ ] `npm run docs:check`
- [ ] `npm run test:run`
- [ ] `npm exec -- tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Relevant browser task or a clear reason it does not apply

## External state

- [ ] No deployment, database, provider, billing, send, permission, or
      destructive action occurred
- [ ] Any approved external action names its target, impact, rollback, and
      independent readback below

Target and environment:

Impact:

Rollback:

Readback:

## Documentation

- [ ] Canonical product and operator docs match the change
- [ ] Public claim files match shipped behavior
- [ ] Known limits and cleanup are explicit

## Security and privacy

- [ ] No credential, private data, cookie, header, export, or session-bearing
      URL is included
- [ ] Test data is synthetic or designated
