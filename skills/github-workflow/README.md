# GitHub Workflow Skill (`github-workflow`)

An isolated, self-contained AI agent skill for managing Git and GitHub workflows with strict safety rules and configurable PR merge target branches.

## Features

- **Explicit commands only**: Never auto-triggers after coding tasks.
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

## Configuration

Set your default PR target branch in [`config.json`](./config.json):

```json
{
  "pr_target_branch": "develop",
  "disallowed_target_branches": ["main", "master"],
  "protected_push_branches": ["main", "master"],
  "allow_pr_merge": false
}
```

You can also override this per project by adding a `.github-workflow.json` file at any repository root.

## Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (used by `scripts/git_context.mjs`)
- [GitHub CLI (`gh`)](https://cli.github.com/) authenticated via `gh auth login`

## Installing into Another Project

Copy this entire `github-workflow/` folder into either:
- **Project-level**: `<your-project>/.agents/skills/github-workflow/`
- **Global (all projects)**: `~/.gemini/config/skills/github-workflow/`
