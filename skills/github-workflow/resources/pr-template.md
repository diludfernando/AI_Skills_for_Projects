# Pull Request Description Guide

## 1. Creating a New Pull Request

Use this structure when opening a new PR. Omit sections that genuinely do not apply, but always keep **Summary** and **Changes Made** concrete and accurate to the diff.

```markdown
## Summary
<!-- 1–3 sentences explaining WHAT changed and WHY. -->

## Changes Made
- **Area / Component**: Concise bullet describing the exact change.
- **Area / Component**: Concise bullet describing the exact change.

## Files / Modules Affected
- `path/to/file` — brief role of the change

## Testing & Verification
- [ ] Unit / integration tests run (include command or result)
- [ ] Manual verification performed (describe what was checked)

## Notes / Follow-ups
<!-- Breaking changes, migration steps, or out-of-scope follow-ups (optional). -->
```

---

## 2. Updating an Existing Open Pull Request (`push` on a branch with an open PR)

When updating a PR that already exists on the current branch:

1. **Preserve existing context**: Keep the original PR intent, links to issues (`Closes #123`), screenshots, and checklist items intact unless they are now factually outdated.
2. **Integrate the new changes cleanly**:
   - Update **Summary** if the overall scope expanded.
   - Add new bullets under **Changes Made** and **Files / Modules Affected** (or update existing bullets if refined).
   - Append a dated **Latest Updates** section at the bottom summarizing what was just pushed so reviewers can quickly see what changed since their last review:

```markdown
### Latest Updates (YYYY-MM-DD)
- Added <new feature / fix> in `path/to/file`.
- Updated <behavior> to handle <edge case>.
```

3. **Never delete reviewer notes, linked issues, or manual checkboxes** the user previously added to the PR body.
