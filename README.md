# AI Skills for Projects

A collection of modular, self-contained AI agent skills. Each skill lives in its own folder under [`skills/`](./skills/) and can be installed individually with a single command.

## Available Skills

| Skill | Folder | Description |
| :--- | :--- | :--- |
| **GitHub Workflow** | [`skills/github-workflow/`](./skills/github-workflow/) | Safe Git & GitHub automation (`push`, `branch push`, PR creation/updates, configurable merge target branch, no auto-merge). |
| **Webpage Testing** | [`skills/webpage-testing/`](./skills/webpage-testing/) | Live browser functional QA (`test page`, `smoke test`) + Playwright E2E test authoring & execution (`write e2e`, `run e2e`). |

---

## Quick Install

Skills can **only** be installed from the **`main`** branch. Run from inside any project (works on Windows, macOS, and Linux — requires Node.js):

```bash
# Interactive menu — pick which skill(s) to install
npx github:diludfernando/AI_Skills_for_Projects#main
```

Or install a specific skill directly:

```bash
# Install into the current project (.agents/skills/)
npx github:diludfernando/AI_Skills_for_Projects#main github-workflow
npx github:diludfernando/AI_Skills_for_Projects#main webpage-testing

# Install globally (available in all projects)
npx github:diludfernando/AI_Skills_for_Projects#main webpage-testing --global
```

After installing, start a **new chat session** in your AI agent and check the skill's `README.md` for any prerequisites or optional `config.json` settings.

<details>
<summary>More install options (CLI flags &amp; linking via <code>skills.json</code>)</summary>

### Installer Flags
```bash
npx github:diludfernando/AI_Skills_for_Projects#main --list                    # List available skills
npx github:diludfernando/AI_Skills_for_Projects#main --all                     # Install all skills
npx github:diludfernando/AI_Skills_for_Projects#main webpage-testing --force   # Overwrite existing install
npx github:diludfernando/AI_Skills_for_Projects#main webpage-testing --global  # Install to ~/.gemini/config/skills/
```

### Link Selectively via `skills.json` (Zero Copying)
If you already cloned this repo locally, point `.agents/skills.json` (or `~/.gemini/config/skills.json`) at `skills/` and pick only the skills you want:

```json
{
  "entries": [
    {
      "path": "/absolute/path/to/AI_Skills_for_Projects/skills",
      "include_only": ["webpage-testing"]
    }
  ]
}
```
</details>

---

## Repository Structure

```text
AI_Skills_for_Projects/
├── README.md
├── package.json                 # Enables 1-command npx installer
├── bin/
│   └── install.mjs              # Interactive CLI skill installer
├── .agents/
│   └── skills.json              # Auto-discovers skills/ inside this repo
└── skills/
    ├── github-workflow/         # Isolated skill folder
    └── webpage-testing/         # Isolated skill folder
```

## Adding a New Skill

Create a new folder under `skills/<your-skill-name>/` with `SKILL.md` and `README.md`, then add it to the **Available Skills** table above. Both `.agents/skills.json` and the CLI installer discover new folders under `skills/` automatically.
