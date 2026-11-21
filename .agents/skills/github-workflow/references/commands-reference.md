# Git & GitHub CLI (`gh`) Safe Command Reference

Use these patterns so commands work reliably on Windows (PowerShell), macOS, and Linux.

## Multiline Commit Messages & PR Bodies (Cross-Platform Safe)

Avoid passing multiline Markdown directly inside shell quotes (`-m "..."` or `--body "..."`), which frequently breaks on PowerShell escaping and backticks. Instead:

1. Write the commit message to a temporary file (e.g., `.git/COMMIT_MSG_DRAFT.txt`), commit with `-F`, then delete the file:
   ```bash
   git commit -F .git/COMMIT_MSG_DRAFT.txt
   ```
2. Write the PR description Markdown to a temporary file (e.g., `.git/PR_BODY_DRAFT.md`), pass `--body-file`, then delete the file:
   ```bash
   # Create a new PR (always pass the configured --base target branch, never a disallowed branch like main)
   gh pr create --base <pr-target-branch> --head <current-branch> --title "<title>" --body-file .git/PR_BODY_DRAFT.md

   # Update an existing open PR
   gh pr edit <pr-number> --body-file .git/PR_BODY_DRAFT.md
   ```
   *(Files inside `.git/` are never tracked by Git, so they won't accidentally get staged, and should still be removed immediately after running the command.)*

---

## Configuring the PR Merge Target Branch in Code

Edit `.agents/skills/github-workflow/config.json` (global skill default) or add `.github-workflow.json` at any repository's root (per-project override):

```json
{
  "pr_target_branch": "develop",
  "disallowed_target_branches": ["main", "master"],
  "protected_push_branches": ["main", "master"],
  "allow_pr_merge": false
}
```

---

## Manual Preflight Fallback (If Node.js Is Unavailable)

```bash
# Current branch
git rev-parse --abbrev-ref HEAD

# Default branch
git symbolic-ref refs/remotes/origin/HEAD

# Status & diff
git status --short
git diff --stat
git diff --cached --stat

# Check GitHub CLI authentication
gh auth status

# Find an existing open PR for the current branch
gh pr list --head <current-branch> --state open --json number,title,url,body,baseRefName
```

---

## Read-Only & Helper GitHub Commands

```bash
# View current branch PR details
gh pr view

# Check CI / status checks on current PR
gh pr checks

# View PR review comments
gh pr view --comments

# Fetch latest remote refs (safe, read-only on working tree)
git fetch origin

# List open issues
gh issue list --limit 20
```

---

## Explicitly Forbidden Commands

Never execute any of the following:
- `gh pr merge` (any flags, including `--auto`, `--squash`, `--rebase`, `--merge`)
- `gh api .../pulls/.../merge`
- `git push --force` / `git push -f` (unless explicitly instructed and confirmed)
- Direct pushes to `main` / `master`
