# AI Skills for Projects

A curated collection of modular, self-contained AI agent skills. Each skill lives in its own isolated folder under [`skills/`](./skills/) so you can browse, maintain, or copy individual skills cleanly into any project.

## Available Skills

| Skill | Folder | Description |
| :--- | :--- | :--- |
| **GitHub Workflow** | [`skills/github-workflow/`](./skills/github-workflow/) | Safe Git & GitHub automation (`push`, `branch push`, PR creation/updates, configurable merge target branch, no auto-merge). |

## Repository Structure

```text
AI_Skills_for_Projects/
├── README.md
├── .agents/
│   └── skills.json              # Registers skills/ for automatic agent discovery
└── skills/
    ├── github-workflow/         # Isolated skill folder
    │   ├── README.md
    │   ├── SKILL.md
    │   ├── config.json
    │   ├── scripts/
    │   ├── resources/
    │   └── references/
    └── <next-skill>/            # Add future skills here as isolated folders
```

## Using a Skill in Another Project

1. Copy any single skill folder from `skills/<skill-name>/` into your project's `.agents/skills/<skill-name>/` (or globally into `~/.gemini/config/skills/<skill-name>/`).
2. Check that skill's `README.md` for any prerequisites or config options.

## Adding a New Skill to This Repo

Create a new isolated folder under `skills/<your-skill-name>/` containing at least `SKILL.md` and a `README.md`, then add it to the **Available Skills** table above. Because `.agents/skills.json` points to `skills/`, new skills are discovered automatically.
