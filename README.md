# AI Skills for Projects

A curated collection of modular, self-contained AI agent skills. Each skill lives in its own isolated folder under [`skills/`](./skills/) so you can download and install **only the skill(s) you need** without cloning the whole repository.

## Available Skills

| Skill | Folder | Description |
| :--- | :--- | :--- |
| **GitHub Workflow** | [`skills/github-workflow/`](./skills/github-workflow/) | Safe Git & GitHub automation (`push`, `branch push`, PR creation/updates, configurable merge target branch, no auto-merge). |
| **Webpage Testing** | [`skills/webpage-testing/`](./skills/webpage-testing/) | Live browser functional QA (`test page`, `smoke test`) + Playwright E2E test authoring & execution (`write e2e`, `run e2e`). |

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
    ├── webpage-testing/         # Isolated skill folder
    │   ├── README.md
    │   ├── SKILL.md
    │   ├── config.json
    │   ├── scripts/
    │   ├── resources/
    │   └── references/
    └── <next-skill>/            # Add future skills here as isolated folders
```

---

## Install Only the Skill You Need (No Full Clone Required)

Replace `<skill-name>` with the folder name of the skill you want (e.g., `github-workflow` or `webpage-testing`).

> **Branch note:** Examples below use `main` by default. If a new skill is only on `develop` before being merged to `main`, append `#develop` in `degit` or `--branch develop` in `git clone`.

### Method 1: One-Line Install with `npx degit` (Fastest)

Downloads **only** that single skill folder with no `.git` history and no other skills (requires Node.js):

**Install into a single project (`.agents/skills/` — recommended for teams):**
```bash
npx degit diludfernando/AI_Skills_for_Projects/skills/<skill-name> .agents/skills/<skill-name>
```

**Install globally (`~/.gemini/config/skills/` — available across all projects):**

*Windows (PowerShell):*
```powershell
npx degit diludfernando/AI_Skills_for_Projects/skills/<skill-name> "$env:USERPROFILE\.gemini\config\skills\<skill-name>"
```

*macOS / Linux (Bash/Zsh):*
```bash
npx degit diludfernando/AI_Skills_for_Projects/skills/<skill-name> ~/.gemini/config/skills/<skill-name>
```

---

### Method 2: Pure Git (`git sparse-checkout` — No `npx` Needed)

Built into Git 2.25+. Fetches only the single skill folder you specify:

**Windows (PowerShell — installs into current project's `.agents/skills/`):**
```powershell
$skill = "webpage-testing"   # or "github-workflow"
git clone --depth 1 --filter=blob:none --sparse https://github.com/diludfernando/AI_Skills_for_Projects.git _tmp_skill
git -C _tmp_skill sparse-checkout set "skills/$skill"
New-Item -ItemType Directory -Path ".agents\skills" -Force | Out-Null
Move-Item "_tmp_skill\skills\$skill" ".agents\skills\$skill" -Force
Remove-Item _tmp_skill -Recurse -Force
```

**macOS / Linux (Bash/Zsh — installs into current project's `.agents/skills/`):**
```bash
SKILL="webpage-testing"      # or "github-workflow"
git clone --depth 1 --filter=blob:none --sparse https://github.com/diludfernando/AI_Skills_for_Projects.git _tmp_skill
git -C _tmp_skill sparse-checkout set "skills/$SKILL"
mkdir -p .agents/skills
mv "_tmp_skill/skills/$SKILL" ".agents/skills/$SKILL"
rm -rf _tmp_skill
```

*(To install globally instead of project-only, replace `.agents/skills` with `$env:USERPROFILE\.gemini\config\skills` on Windows or `~/.gemini/config/skills` on macOS/Linux.)*

---

### Method 3: Link Selectively via `skills.json` (`include_only`, Zero Copying)

If you prefer cloning this repo once and keeping skills updated via `git pull`, point any project's `.agents/skills.json` (or global `~/.gemini/config/skills.json`) at your local clone and cherry-pick only the skills you want with `include_only`:

```json
{
  "entries": [
    {
      "path": "/absolute/path/to/AI_Skills_for_Projects/skills",
      "include_only": ["github-workflow", "webpage-testing"]
    }
  ]
}
```
*(Omit `include_only` if you want to load all skills in the repo. On Windows, use forward slashes like `C:/Users/<you>/Desktop/AI_Skills_for_Projects/skills`.)*

---

### Final Step: Check Prerequisites & Start a New Chat

1. Open the installed skill's `README.md` (e.g., [`skills/github-workflow/README.md`](./skills/github-workflow/README.md) or [`skills/webpage-testing/README.md`](./skills/webpage-testing/README.md)) to install any required CLI tools or configure `config.json`.
2. Start a **new conversation/session** in your AI agent so it discovers the newly installed skill.

---

## Adding a New Skill to This Repo

1. Create a new isolated folder under `skills/<your-skill-name>/` containing at least `SKILL.md` and `README.md`.
2. Add it to the **Available Skills** table at the top of this file.
3. Because `.agents/skills.json` points to `skills/`, any new skill folder is discovered automatically when working in this repository.
