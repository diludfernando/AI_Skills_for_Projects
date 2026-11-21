# GitHub Workflow Skill (`github-workflow`)

An isolated, self-contained AI agent skill for managing Git and GitHub workflows with strict safety rules and configurable PR merge target branches.

## Features

- **Explicit commands only**: Never auto-triggers after finishing coding tasks.
- **No PR merging**: Permanently blocks merging Pull Requests (`gh pr merge`, API, or UI).
- **Mandatory confirmation preview**: Always shows branch, files, commit message, and PR title/description before mutating Git or GitHub.
- **Configurable merge target in code**: Prevents PRs from accidentally targeting `main` or `master`.
- **Smart PR handling**:
  - `push` — Commits and pushes to the current branch; updates the existing open PR description with new changes, or automatically creates a detailed PR if none exists.
  - `branch push [name]` — Creates a new branch (named or auto-generated from the diff), commits, pushes, and opens a detailed PR.
  - `pr status` / `pr comments` / `sync` / `issue` — Safe helper operations.

## Folder Structure

```text
github-workflow/
├── README.md                          # This guide
├── SKILL.md                           # Main skill instructions & trigger rules
├── config.json                        # Merge target & branch protection config
├── scripts/
│   └── git_context.mjs                # Read-only Git + config + PR context inspector (Node.js)
├── resources/
│   └── pr-template.md                 # Templates for creating & updating PR descriptions
└── references/
    └── commands-reference.md          # Cross-platform safe git & gh CLI patterns
```

---

## Step-by-Step Installation

### 1. Install Prerequisites

Make sure these three tools are installed and available in your terminal `PATH`:

| Tool | Purpose | Quick Install (Windows) | Quick Install (macOS) |
| :--- | :--- | :--- | :--- |
| **Git** | Branching, committing, pushing | `winget install --id Git.Git` | `brew install git` |
| **Node.js** | Runs `scripts/git_context.mjs` | `winget install --id OpenJS.NodeJS.LTS` | `brew install node` |
| **GitHub CLI (`gh`)** | Checks, creates, and edits PRs | `winget install --id GitHub.cli` | `brew install gh` |

Authenticate GitHub CLI once:

```bash
gh auth login
```

Verify authentication:

```bash
gh auth status
```

### 2. Install This Skill

Run one command from inside your project (works on Windows, macOS, and Linux):

```bash
# Install into the current project (.agents/skills/github-workflow/)
npx github:diludfernando/AI_Skills_for_Projects github-workflow

# Or install globally (available across all projects)
npx github:diludfernando/AI_Skills_for_Projects github-workflow --global
```

*(Append `#develop` after the repo name if installing from `develop` before merge to `main`.)*

### 3. Configure Your PR Merge Target Branch

Open [`config.json`](./config.json) inside your installed `github-workflow/` folder and set `pr_target_branch` (for example `"develop"` or `"staging"`):

```json
{
  "pr_target_branch": "develop",
  "disallowed_target_branches": ["main", "master"],
  "protected_push_branches": ["main", "master"],
  "allow_pr_merge": false
}
```

- Leave `pr_target_branch` as `""` if you want the agent to ask you for the target branch whenever none is specified (it will still **never** default to `main` or `master`).
- To use a different target branch in a specific repository, add a `.github-workflow.json` file at that repository's root:
  ```json
  {
    "pr_target_branch": "staging"
  }
  ```

### 4. Verify the Installation

1. Run the helper script from inside any Git repository to verify everything is wired up:
   ```bash
   # If installed in a project:
   node .agents/skills/github-workflow/scripts/git_context.mjs
   ```
   Confirm the JSON output shows `"is_git_repo": true`, `"gh_authenticated": true`, and your expected `"pr_target_branch"`.
2. Start a **new chat/session** with your AI agent so it reloads the available skills list.

---

## Usage Examples

Once installed, the agent stays silent during normal coding and activates this skill only when you explicitly issue a command:

| Command | What the Agent Does (After Showing Preview & Getting Your Approval) |
| :--- | :--- |
| `push` | Commits & pushes to the current branch; updates the open PR description if one exists, or creates a new PR into your configured target branch. |
| `push --to staging` | Same as `push`, overriding the PR merge target to `staging` (blocked if in `disallowed_target_branches`). |
| `branch push` | Proposes a branch name from your diff, creates it, commits, pushes, and opens a new detailed PR. |
| `branch push feat/auth` | Creates `feat/auth`, commits, pushes, and opens a new detailed PR. |
| `branch push fix/nav --to develop` | Creates `fix/nav`, pushes, and opens a PR targeting `develop`. |
| `pr status` | Shows the current branch's open PR details and CI check status (read-only). |
| `pr comments` | Shows PR review comments and discussion threads (read-only). |
| `sync` | Checks if your branch is behind the configured target branch before asking to rebase/update. |
