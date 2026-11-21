---
name: github-workflow
description: >-
  Manages Git and GitHub workflows including committing, pushing, branching,
  and creating or updating Pull Requests with detailed descriptions. Use ONLY
  when the user explicitly triggers a GitHub workflow command such as "push",
  "branch push", or explicitly asks for GitHub operations (PR status, checks,
  issues, syncing branches). Never trigger automatically after finishing a
  coding task, never merge Pull Requests, and respect configured PR target
  branches (never targeting main/master when disallowed).
---

# GitHub Workflow Skill

This skill governs all Git and GitHub operations. Follow every safety rule, merge-target config, and confirmation gate strictly.

## Non-Negotiable Safety Rules

1. **NEVER Merge Pull Requests**:
   - You are strictly forbidden from merging any PR (`gh pr merge`, GitHub REST/GraphQL merge APIs, or clicking Merge in a browser).
   - If asked to merge a PR, refuse politely and instruct the user to review and merge it manually on GitHub.
2. **NEVER Auto-Trigger After Coding**:
   - Do **not** run `push`, `branch push`, `git commit`, `git push`, or `gh pr create` automatically after completing an implementation or bug fix.
   - Wait until the user explicitly issues a command (e.g., `push`, `branch push`, `branch push feat/login`).
3. **ALWAYS Confirm Before Mutating Remote or History**:
   - Before executing any commit, branch creation, push, PR creation, or PR edit, present a concise **Execution Preview** and wait for explicit user approval.
4. **Protect Default & Protected Branches**:
   - Never commit or push directly to any branch listed in `protected_push_branches` or the repository's default branch (`main`, `master`, etc.).
5. **Respect Configured PR Merge Target (Never Default to `main`)**:
   - Always resolve the PR target/base branch from [config.json](./config.json) (overridden per-project by `<repo-root>/.github-workflow.json`), or from an explicit `--to <target-branch>` supplied in the user's command.
   - **NEVER** target any branch listed in `disallowed_target_branches` (by default `["main", "master"]`) when opening a PR or syncing branches.
   - If `pr_target_branch` is empty/unset and the user did not specify `--to <target-branch>`, **STOP and ask the user** which target branch to merge the PR into (listing `available_target_candidates` from `git_context.mjs` if any). Do **not** fall back to `main` or `master`.
6. **No Destructive Git Commands**:
   - Never run `git push --force`, `git reset --hard`, or history rewrites unless the user explicitly asks for that specific operation and confirms the risk.
7. **Guard Against Secrets**:
   - Before staging files, check for `.env`, private keys, tokens, or credential files. Warn the user and exclude them unless explicitly told otherwise.

---

## Merge Target Configuration (In Code)

The merge target branch and branch-protection policy are defined in code so the agent never opens PRs targeting `main` by accident:

1. **Skill default config**: [config.json](./config.json)
2. **Per-repository override (optional)**: `.github-workflow.json` in the root of any project repository (overrides keys from `config.json`).

```json
{
  "pr_target_branch": "develop",
  "disallowed_target_branches": ["main", "master"],
  "protected_push_branches": ["main", "master"],
  "allow_pr_merge": false
}
```

- **`pr_target_branch`**: The branch new PRs will merge into (`gh pr create --base <pr_target_branch>`). Set this to e.g. `"develop"`, `"dev"`, `"staging"`, or `"release/v1"`. Leave `""` to require the agent to ask you each time instead of guessing `main`.
- **`disallowed_target_branches`**: Branches the agent is forbidden from using as a PR merge target (defaults to `["main", "master"]`).
- **`protected_push_branches`**: Branches where direct `push` is blocked (must use `branch push`).
- **`allow_pr_merge`**: Permanently `false` (enforced by policy).

---

## Preflight: Gather Context First

Before proposing any action for `push` or `branch push`, run the helper script to inspect repository, config, and PR state in one step:

```bash
node .agents/skills/github-workflow/scripts/git_context.mjs
```

If Node.js is unavailable, fall back to the manual commands in [commands-reference.md](./references/commands-reference.md) and read [config.json](./config.json) (plus `<repo-root>/.github-workflow.json` if present).

Verify from the output:
- The workspace is a Git repository with a configured remote (`origin`).
- GitHub CLI (`gh`) is installed and authenticated (`gh_authenticated: true`). If not, stop and tell the user how to install/authenticate (`gh auth login`) before proceeding.
- `pr_target_branch_disallowed` is `false`. If `true`, stop and ask the user to update `pr_target_branch` to an allowed branch.
- There are actual changes to ship (staged, unstaged, untracked files, or unpushed commits). If the working tree is clean and there are no unpushed commits, inform the user and stop.

---

## Core Commands

### 1. `push` (optional: `push --to <target-branch>`)
**Trigger**: User explicitly says `push` (or e.g. `push --to develop`).

**Procedure**:
1. Run `git_context.mjs` and inspect the full diff (`git diff` and `git diff --cached`, plus newly untracked files) so you accurately understand every change.
2. **Protected Branch Check**:
   - If `is_protected_push_branch` is `true` (e.g., on `main`, `master`, or a branch in `protected_push_branches`), **STOP immediately**.
   - Inform the user they are on a protected branch and suggest running `branch push` (or `branch push <branch-name>`) instead.
3. **Resolve PR Merge Target Branch**:
   - Priority: explicit `--to <target-branch>` in user message → `pr_target_branch` from config.
   - Verify the resolved target branch is **not** in `disallowed_target_branches` and is not the same as `current_branch`.
   - If no open PR exists and no valid target branch is resolved, **STOP and ask the user** which target branch the PR should merge into (never default to `main` or `master`).
4. **Draft Commit Message** (if there are uncommitted changes):
   - Write a clear Conventional Commit message (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`) summarizing the *why* and *what*.
5. **Determine PR Action** using `open_pr` from `git_context.mjs`:
   - **Case A — Open PR already exists (`open_pr` is present)**:
     - Read the existing PR title, `baseRefName`, and `body` carefully.
     - If `open_pr.baseRefName` is in `disallowed_target_branches`, highlight a **WARNING** in the preview so the user knows the PR currently targets a disallowed branch.
     - Prepare an **updated PR description** following [pr-template.md](./resources/pr-template.md): preserve important existing context and integrate/append the newly pushed changes clearly (do not wipe out prior details).
   - **Case B — No open PR exists (`open_pr` is null)**:
     - Prepare a **new Pull Request** targeting the resolved `pr_target_branch` (never a disallowed branch like `main`) with a clear title and detailed description following [pr-template.md](./resources/pr-template.md).
6. **Show Execution Preview & Wait for Confirmation**:
   - Present:
     - Source branch (`current_branch`) → **PR Merge Target Branch** (`pr_target_branch` or `open_pr.baseRefName`)
     - Files to be staged/committed (and any excluded secret/sensitive files)
     - Proposed commit message (or note if pushing already-committed changes)
     - PR action: **Update PR #\<number\>** or **Create New PR**
     - Proposed PR title & full description (or exact additions/updates to the PR description)
   - Ask: *"Proceed with committing, pushing, and creating/updating the PR?"*
7. **Execute (only after user confirms)**:
   - Stage intended files (`git add ...`, avoiding sensitive files) and commit (`git commit -F <msg-file>`).
   - Push to remote (`git push` or `git push -u origin <branch>` if no upstream is set).
   - Write the PR description to a temporary file and run `gh pr edit <number> --body-file <file>` (Case A) or `gh pr create --base <pr_target_branch> --head <branch> --title "<title>" --body-file <file>` (Case B). Remove the temporary file afterward.
8. **Verify & Report**:
   - Verify `git status` is clean and print the commit hash, pushed branch, PR target branch, and clickable PR URL.

---

### 2. `branch push` (optional: `branch push <branch-name> [--to <target-branch>]`)
**Trigger**: User explicitly says `branch push` with an optional branch name and/or `--to <target-branch>`.

**Procedure**:
1. Run `git_context.mjs` and inspect all changes (`git diff`, `git diff --cached`, untracked files).
2. **Choose New Branch Name**:
   - If the user supplied `<branch-name>`, use it (sanitized to valid git branch characters).
   - Otherwise, propose a concise semantic branch name derived from the diff (e.g., `feat/user-auth`, `fix/navbar-overflow`, `docs/api-guide`).
3. **Resolve PR Merge Target Branch**:
   - Priority: explicit `--to <target-branch>` → `pr_target_branch` from `config.json` / `.github-workflow.json`.
   - Validate the target branch is **not** in `disallowed_target_branches` (e.g. `main`/`master`).
   - If unset, **STOP and ask the user** which branch the PR should target (suggesting `available_target_candidates` if any) and remind them they can set `pr_target_branch` in `config.json` or `.github-workflow.json`.
4. **Draft Commit Message & New PR Description**:
   - Write a Conventional Commit message.
   - Draft a detailed new PR title and body using [pr-template.md](./resources/pr-template.md), targeting the resolved `pr_target_branch`.
5. **Show Execution Preview & Wait for Confirmation**:
   - Present:
     - New branch name → **PR Merge Target Branch** (`pr_target_branch`)
     - Files to be staged/committed
     - Proposed commit message
     - Proposed PR title & full description
   - Ask: *"Proceed with creating the branch, committing, pushing, and opening the PR?"*
6. **Execute (only after user confirms)**:
   - Create and switch to the new branch: `git checkout -b <branch-name>`.
   - Stage intended files and commit.
   - Push and set upstream: `git push -u origin <branch-name>`.
   - Create the PR with `gh pr create --base <pr_target_branch> --head <branch-name> --title "<title>" --body-file <file>`.
   - Clean up temporary body/message files.
7. **Verify & Report**:
   - Verify the active branch, clean working tree, and return the commit hash, target branch, and clickable PR URL.

---

### 3. Other Supported GitHub Commands (Explicitly Requested)

For general GitHub requests outside `push` / `branch push`, see [commands-reference.md](./references/commands-reference.md):
- **`pr status`** / **"check PR"**: Show open PR details, review decision, and CI check status (`gh pr view`, `gh pr checks`). Read-only — no confirmation needed.
- **`pr comments`**: Fetch review comments and discussion threads on the current branch's PR. Read-only.
- **`sync`**: Fetch `origin` and report whether the current branch is behind the configured `pr_target_branch` (never automatically referencing `main` if disallowed); ask for confirmation before rebasing or merging the target branch into the feature branch.
- **`issue`**: List, view, or (with confirmation) create GitHub issues via `gh issue`.
- **`merge` / "merge PR"**: **Always refused** under Safety Rule #1.
