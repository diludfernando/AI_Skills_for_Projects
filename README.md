# AI Skills for Projects

A curated collection of modular, self-contained AI agent skills. Each skill lives in its own isolated folder under [`skills/`](./skills/) so you can browse, maintain, or install individual skills cleanly into any project or globally on your machine.

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

---

## How to Install a Skill to Your AI Agent

First, clone this repository to your machine (once):

```bash
git clone https://github.com/diludfernando/AI_Skills_for_Projects.git
```

Then choose **one** of the three installation methods below depending on how you want to use the skill.

### Option 1: Install for a Single Project (Recommended for Teams)

Copy the skill folder into your target project's `.agents/skills/` directory so it is committed with your project and shared with teammates.

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path "<path-to-your-project>\.agents\skills" -Force
Copy-Item -Path ".\AI_Skills_for_Projects\skills\github-workflow" `
  -Destination "<path-to-your-project>\.agents\skills\github-workflow" -Recurse -Force
```

**macOS / Linux (Bash/Zsh):**
```bash
mkdir -p "<path-to-your-project>/.agents/skills"
cp -R ./AI_Skills_for_Projects/skills/github-workflow "<path-to-your-project>/.agents/skills/"
```

### Option 2: Install Globally (Available in Every Project on Your Machine)

Copy the skill folder into your global agent config directory (`~/.gemini/config/skills/`).

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.gemini\config\skills" -Force
Copy-Item -Path ".\AI_Skills_for_Projects\skills\github-workflow" `
  -Destination "$env:USERPROFILE\.gemini\config\skills\github-workflow" -Recurse -Force
```

**macOS / Linux (Bash/Zsh):**
```bash
mkdir -p ~/.gemini/config/skills
cp -R ./AI_Skills_for_Projects/skills/github-workflow ~/.gemini/config/skills/
```

### Option 3: Link All Skills Automatically via `skills.json` (No Copying)

Instead of copying folders every time a skill is updated, point your global or project `skills.json` directly at your local clone of this repo's `skills/` folder:

1. Create or edit `~/.gemini/config/skills.json` (global) or `<your-project>/.agents/skills.json` (project-only):
   ```json
   {
     "entries": [
       {
         "path": "/absolute/path/to/AI_Skills_for_Projects/skills"
       }
     ]
   }
   ```
   *(On Windows, use forward slashes like `C:/Users/<you>/Desktop/AI_Skills_for_Projects/skills` or escaped backslashes `C:\\Users\\...`.)*
2. Whenever you pull updates (`git pull`) in this repo, all linked projects automatically get the latest skills.

### Final Step: Check Skill Prerequisites & Start a New Chat

1. Open the specific skill's `README.md` (for example, [`skills/github-workflow/README.md`](./skills/github-workflow/README.md)) to install any required CLI tools or configure settings.
2. Start a **new conversation/session** in your AI agent so it discovers the newly installed skill.

---

## Adding a New Skill to This Repo

1. Create a new isolated folder under `skills/<your-skill-name>/` containing at least `SKILL.md` and `README.md`.
2. Add it to the **Available Skills** table at the top of this file.
3. Because `.agents/skills.json` points to `skills/`, any new skill folder is discovered automatically when working in this repository.
