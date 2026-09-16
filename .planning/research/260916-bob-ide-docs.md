# IBM Bob IDE documentation map (for the gsd-bob installer)

Research date: 2026-09-16. All quotes are verbatim from the live pages fetched that day unless marked otherwise.
Method: enumerated `https://bob.ibm.com/sitemap.xml` (138 English `/docs/*` URLs: 100 IDE, 40 Shell), fetched every relevant page as server-rendered HTML, and diffed IDE pages against their Shell counterparts. Also mined the docs' own feedback tracker (`github.com/IBM/ibm-bob`, labelled `bob-docs`) and recovered one removed page from the Wayback Machine.

Version convention used below:
- "IDE 2.x" = the current 2.0.0–2.1.0 line; "IDE 1.x" = 1.0.1–1.0.3.
- Most feature pages state **no version**. Where the changelog ties a feature to a release I cite that release; otherwise I write "version not stated".
- "Shell" = Bob Shell (`bob` CLI), current 2.0.3.

---

## 1. Install, requirements, current version, version history

### 1.1 What Bob IDE is (standalone app built on VS Code)

- IDE quickstart, https://bob.ibm.com/docs/ide/getting-started/quickstart — "Download and install the IBM Bob application on your computer. Bob is a standalone IDE application and not an extension." (version not stated)
- IDE changelog 1.0.3 (May 2026), https://bob.ibm.com/docs/ide/changelog — "VS Code engine uplift: 1.109.5 → 1.116.0 … Upgraded the underlying VS Code platform to version 1.116.0".
- IDE premium packages, https://bob.ibm.com/docs/ide/premium-packages/updating-premium-packages — "Open IBM Bob and select Extensions." / "Install from VSIX…" / "download and install a specific VSIX package from the Open VSX Registry."
- IDE rules page, https://bob.ibm.com/docs/ide/configuration/rules — settings key `"bob-code.useAgentRules"` (the bundled extension id is `bob-code`).
- Bug report on the docs tracker (user-submitted, version "1.126.0 bob2.1.0"), https://github.com/IBM/ibm-bob/issues/3647 — names the extension file `resources/app/extensions/bob-code/dist/extension.js`; the issue template labels the product "Bob IDE (VS Code Extension)". Another user report gives "Version: 2.0.3 (Build 1.126.0+bob2.0.3.20260812174351) Installation: IBM Bob.app (standalone, /Applications/IBM Bob.app)" (https://github.com/IBM/ibm-bob/issues/3591).
- Contradiction: `https://bob.ibm.com/llms.txt` says "[Install Bob IDE](…/install): Install Bob extension for VS Code" and still lists "Code mode … Advanced mode … Orchestrator mode" (the 1.x mode set). See Contradictions §C1.

### 1.2 System requirements and install

- https://bob.ibm.com/docs/ide/getting-started/install — "macOS, Linux, or Windows"; "Minimum 4 GB RAM (8 GB recommended)"; "At least 500 MB available disk space"; macOS `.pkg` (Mac ARM / Mac Intel), Debian `.deb`, Red Hat/Fedora `.rpm`, Windows `.exe`; "An IBMid is required to authenticate." (version not stated)
- Releases page https://bob.ibm.com/releases lists IDE downloads for "2.1.0 Latest", 2.0.3, 2.0.2, 2.0.1, 2.0.0 (Mac ARM, Mac Intel, Windows x64 (User), Linux .deb amd64, Linux RPM x64).
- Shell install, https://bob.ibm.com/docs/shell/getting-started/install-and-setup — "Node.js Version 24 or later"; "macOS, Linux, Windows, z/OS UNIX System Services (os390-s390x), or Linux on IBM Z"; `curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash`; "Bob Shell 2.0.0 requires a fresh install. Currently there is no automated upgrade path from 1.0.x. Your existing settings and configurations will be preserved during the install."; API key via `BOB_API_KEY` env var ("Set the `BOB_API_KEY` environment variable"). Note: the env var documented is `BOB_API_KEY`, not `BOBSHELL_API_KEY`.
- Shell uninstall, https://bob.ibm.com/docs/shell/getting-started/uninstalling-bobshell — `npm uninstall -g bobshell`; "Remove configuration files (optional) … `rm -rf ~/.bob`".

### 1.3 Forced-upgrade notice

- IDE landing page, https://bob.ibm.com/docs/ide — "IDE v1.0.3 and v2.0.0 will stop working on September 30, 2026. If you are on v1.0.3, you must upgrade to the latest v2.0.x release. If you are on v2.0.0, you must upgrade to v2.0.2 or later."

### 1.4 IDE version history (https://bob.ibm.com/docs/ide/changelog)

| Version | Date (as stated) | Items relevant to an installer |
|---|---|---|
| 1.0.1 | March 2026 | Modes: "Code mode … Ask mode … Plan mode … Advanced mode provides extended capabilities including MCP and browser tools. Orchestrator mode coordinates multi-step projects". "Apply persistent context with Bob Rules in `.bob/rules/` directories." "Define skills in `.bob/skills/` directories … Skills automatically activate in Advanced mode when relevant to your task." |
| 1.0.2 | April 2026 | "Init Command: Corrected typo in the init command: "rules-advance" is now "rules-advanced"." |
| 1.0.3 | May 2026 | VS Code engine 1.109.5 → 1.116.0. |
| 2.0.0 | June 2026 | "Subagents … spawning specialized subagents … You approve each spawn before it starts." "Simplified default modes: Bob now ships with three focused default modes: Plan, Agent, and Ask … with Advanced and Orchestrator capabilities folded into the defaults." "Workspace-scoped modes management: A new Modes tab in settings". "Skills settings tab". "MCP server management … MCP Servers tab". "Parallel tool calling". "Mode-based subagent control: Modes can now restrict which subagents they allow to run. Subagent spawns now require explicit approval". "Nested workflows: Workflows can now invoke other workflows". "Auto-approved commands". "Task-level MCP approvals". Context window "200,000 to 270,000 tokens". |
| 2.0.1 | July 2026 | "Symlinked rules folders: Rules stored in symlinked folders inside `.bob/rules/` are now loaded correctly." "Workspace command migration now runs safely even if triggered multiple times." "MCP resources and prompts … accessible via mentions (@) and slash actions (/)". |
| 2.0.2 | August 2026 | "Workspace trust … Untrusted folders run in safe mode: workspace-sourced configuration, skills, agents, rules, and MCP servers are suspended until you explicitly grant trust. Use the `/permissions` command". "Command lifecycle hooks … Define hooks in `.bob/settings.json` in your workspace or globally in `~/.bob/settings/settings.json`." "Fewer unnecessary mode switches". "Workspace trust not applied to hooks" fix. |
| 2.0.3 | August 2026 | Arabic; "Task history retained for 30 days". |
| 2.1.0 | August 2026 (listed latest) | "Manage hooks from Bob Settings: A new Hooks tab". "Enforce hooks across all users with a policy … `EnforcedHooks`". "Global skill directories excluded from workspace scope: Skills in global skill directories are no longer included in workspace-scoped skill discovery". "HTML artifact requires explicit request: The `create_html_artifact` tool is no longer invoked for general formatting". Office tools `office_read`/`office_edit`. |

### 1.5 Shell version history (https://bob.ibm.com/docs/shell/changelog)

| Version | Date | Relevant items |
|---|---|---|
| 1.0.1 | March 2026 | "Code mode … Ask mode … Plan mode … Advanced mode provides extended capabilities including MCP tools." "Define custom modes … Create reusable command shortcuts." |
| 1.0.3 | April 2026 | API key authentication. |
| 2.0.0 | August 2026 | "Skills … Skills were not available in Bob Shell 1.0.x." "Redesigned settings schema: Settings are now stored at `~/.bob/settings/settings.json`. The schema adds a `telemetry` section, an `edit` tool group". "Agent mode replaces Code and Advanced modes". `bob mcp add|add-json|remove|list` "Supports both global and workspace scopes". |
| 2.0.1 | August 2026 | "alwaysAllow MCP tools respected in Bob Shell: MCP tools listed in `alwaysAllow` inside `.bob/mcp.json` are now automatically approved … Previously, this setting was honored only in the IDE extension." "Writes to `.bob/settings.json` and `~/.bob/*/settings.json` now always require one-time explicit user approval". "Tool calls that write to Bob's home directory (for example, `~/.bob/`) are no longer automatically approved". "Bob Shell now prioritizes `.git` over `.bob` when walking up the directory tree to find the workspace root … no longer causes workspace-scoped skills, rules, and modes to be silently missed." |
| 2.0.2 | August 2026 | "Agent Client Protocol (ACP) … Bob's full runtime is available through the ACP connection, including modes, MCP servers, skills, tool approvals". `/hooks`. "Global skill directories excluded from workspace scope". z/OS support. |
| 2.0.3 | September 2026 | `PreCompact`/`PostCompact` hooks; HTTPS hook handlers; MCP OAuth (interactive only); "Warnings for invalid skill directory names"; "Unified /compact slash command … across both Bob IDE and Bob Shell". |

- The releases page HTML also contains a `2.0.4.tgz` Shell artifact with no changelog entry (https://bob.ibm.com/releases) — existence only; contents unknown.

---

## 2. Config and settings storage

### 2.1 `~/.bob` is the IDE's global config root (IDE 2.x)

Every documented global path for the IDE is under `~/.bob`. No page mentions VS Code `globalStorage`, `settings.json` under `Code/User`, or any other location; searched all 100 IDE pages for `globalStorage` — zero hits.

| Artifact | IDE global path | IDE project path | Source (IDE) |
|---|---|---|---|
| Custom modes | `~/.bob/settings/custom_modes.yaml` | `.bob/custom_modes.yaml` | https://bob.ibm.com/docs/ide/configuration/custom-modes — "Global modes: Edit `~/.bob/settings/custom_modes.yaml` via Settings → Modes → Edit Global Modes"; "Project modes: Edit `.bob/custom_modes.yaml` in your project." |
| Hooks / settings | `~/.bob/settings/settings.json` | `.bob/settings.json` | https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks — "Global (all workspaces) `~/.bob/settings/settings.json`; Workspace (current project) `.bob/settings.json`" (IDE 2.0.2+) |
| MCP | `~/.bob/mcp.json` | `.bob/mcp.json` | https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob — "Global: Stored in `~/.bob/mcp.json`, applies across all workspaces. Project: Stored in `.bob/mcp.json` in your project root". **Contradicted elsewhere, see §C3.** |
| Rules | `~/.bob/rules/` (Windows `%USERPROFILE%\.bob\rules\`) | `.bob/rules/`, `.bob/rules-{mode-slug}/` | https://bob.ibm.com/docs/ide/configuration/rules |
| Skills | `~/.bob/skills/` | `.bob/skills/` | https://bob.ibm.com/docs/ide/features/skills |
| Commands | `~/.bob/commands/` | `.bob/commands/` | https://bob.ibm.com/docs/ide/features/slash-commands |
| Agent personas | `~/.bob/agents/` | `.bob/agents/` | Removed page, recovered from Wayback (see §8) |
| Ignore | — | `.bobignore` (workspace root) | https://bob.ibm.com/docs/ide/configuration/bobignore |
| Context | — | `AGENTS.md` at workspace root | https://bob.ibm.com/docs/ide/configuration/rules |

- Legacy JSON modes file: custom-modes page — "Global modes: Automatically migrated from legacy `custom_modes.json` to `custom_modes.yaml` on startup. Project modes: Converted to YAML when edited through the UI … legacy JSON format files are still supported for backward compatibility". (version not stated)
- IDE settings export/reset: https://bob.ibm.com/docs/ide/troubleshooting/ts-reset-application — "Click the Export button, next to Export Bob settings to a JSON file"; "Click the Reset button to reset all state and secret storage." After reset "you will need to reconfigure: Custom instructions, Mode preferences, Any workspace-specific settings, MCP server connections". (Does not name the on-disk location of that state.)
- Upgrade: https://bob.ibm.com/docs/ide/getting-started/migrating — "Your settings are automatically carried over during the upgrade." "If you prefer to remain on your current version … you can do this if you are on version 1.0.2: Open your `settings.json` file. Set `update.mode` to `manual`." (That `settings.json` is the VS Code-style editor settings file; the page does not give its path.)
- Windows tilde handling (user bug report, IDE 2.1.0): https://github.com/IBM/ibm-bob/issues/3647 — the agent's system prompt tells it to write to `~/.bob/settings/...`; on Windows `~\.bob\...` is not expanded. Third-party, unverified, but it corroborates `~/.bob/settings/` as the IDE's home and adds `~/.bob/settings/mcp.json` (see §C3).

### 2.2 Shell settings storage (for comparison)

- https://bob.ibm.com/docs/shell/configuration/configuring — "User (all workspaces) `~/.bob/settings/settings.json`; Project (current workspace) `<workspace>/.bob/`"; schema keys `session.maxTurns`, `session.defaultMode`, `session.mcp`, `session.subagents`, `logging.logLevel`, `tasks.retentionDays`, `telemetry.enabled`, `telemetry.excludePayload`; "Authentication tokens (OAuth) are stored separately in `~/.bob/settings/auth-secrets.json`." Logs: `~/.bob/logs/shell/`. (Shell 2.0.0+: "Settings are now stored at `~/.bob/settings/settings.json`".)
- https://bob.ibm.com/docs/shell/configuration/approval-settings — "The `approval` key in `~/.bob/settings/settings.json` controls which tool groups and individual tools are automatically approved. **This file is shared with the IDE; changes made through the IDE settings UI are written to the same file.**" Permission group IDs: `read, edit, execute, mcp, skill, todo, subtask, subagent, mode`.
- https://bob.ibm.com/docs/shell/security/trusted-folders — `~/.bob/trustedFolders.json` (Shell); "The trusted folders feature is disabled by default … set Folder Trust to `true`" / `security.folderTrust.enabled`.
- Shell troubleshooting, https://bob.ibm.com/docs/shell/troubleshooting/troubleshoot — "Project settings: `.bob/settings.json` … User settings: `~/.bob/settings.json`" (**contradicts** `~/.bob/settings/settings.json`, §C4); also "Check that files have the correct extensions (`.md`, `.txt`, or `.xml`)" for rules and `/memory refresh` / `/memory show`.

---

## 3. Custom modes

### 3.1 Files and schema (IDE)

Source: https://bob.ibm.com/docs/ide/configuration/custom-modes (version not stated; UI features date to IDE 2.0.0 "Modes tab").

- Paths: "Global modes: Edit `~/.bob/settings/custom_modes.yaml`" / "Project modes: Edit `.bob/custom_modes.yaml` in your project."
- Shape: "These files define an array of custom modes in YAML format." Example:
  ```yaml
  customModes:
    - slug: docs-writer
      name: 📝 Documentation Writer
      description: Writes and revises Markdown documentation.
      roleDefinition: You are a technical writer specializing in clear documentation.
      whenToUse: Use this mode for writing and editing documentation.
      customInstructions: Focus on clarity and completeness in documentation.
      groups:
        - read
        - - edit
          - fileRegex: ".*\\.(md|mdx)$"
            description: Markdown files only
        - skill
  ```
- Components table: Slug, Name, Role definition, When to use, Available tools, Custom instructions, Description, "Allowed subagents | (Optional) Restricts which subagent presets the mode can use".
- Tool group vocabulary (IDE): "`read`: Read files and directories; `edit`: Modify files (can be restricted with `fileRegex`); `execute`: Run terminal commands; `mcp`: Access MCP servers; `skill`: Load skills; `workflow`: Launch pre-defined workflows; `todo`: Update task todo lists; `subtask`: Create subtasks; `subagent`: Spawn subagents; `mode`: Switch to another mode".
  - **Not in the IDE list:** `command`, `browser`, `artifact`. (`command`/`browser` appear only in Shell docs and the removed personas page; `artifact` appears nowhere in official docs. See §C2.)
- `fileRegex`: "Restrict which files a mode can edit using `fileRegex`"; example `- - edit` / `- fileRegex: ".*\\.(js|ts)$"` / `description: JavaScript and TypeScript files only`.
- Validation rules (verbatim list): "`slug` must use only letters, numbers, and hyphens." "Keep each `slug` unique. Duplicate slugs can prevent modes from loading correctly." "Use only supported group names. Unknown group names do not grant access." "If you omit `groups`, the mode does not get any grouped tools." "If you set `allowedSubagents`, only the listed subagent presets are available in that mode." "Invalid `fileRegex` values can prevent the mode file from loading."
- Overriding built-ins: "You can override default Bob modes (such as Agent, Ask, or Plan) by creating a custom mode with the same slug in your project configuration." Example slug `ask`. "Project-specific overrides take precedence over global overrides, which take precedence over defaults."
- Mode-specific instructions: "Preferred method (directory structure): `.bob/rules-{mode-slug}/01-style-guide.md`…" "Alternative method (single file): `.bobrules-{mode-slug}`" "The directory method takes precedence if both exist. Files in the directory are loaded alphabetically and combined with the `customInstructions` property".
- Modes become slash commands: https://bob.ibm.com/docs/ide/features/slash-commands — "Custom modes you create also appear as slash commands (e.g., a mode with slug `reviewer` becomes `/reviewer`). These mode commands cannot be overridden by custom workflow commands."
- Tutorial confirmation that the UI writes the project file: https://bob.ibm.com/docs/ide/tutorials/add-bob-capabilities — "Bob creates a `custom_modes.yaml` file in `.bob` that contains the product manager mode configuration."

### 3.2 Built-in modes (IDE 2.x)

Source: https://bob.ibm.com/docs/ide/features/modes.
- "By default, the following three modes are available with Bob": Agent, Plan, Ask.
- Agent: "Available tools | `Read`, `Edit`, `Execute`, `MCP`, `Skill`, `Todo`, `Subtask`, `Subagent`, `Mode`" / "Allowed subagents | `All`".
- Plan: tools "`Read`, `Edit`, `MCP`, `Skill`, `Subagent`, `Mode`", "Allowed subagents | `Explore`"; "Custom instructions | Must always start of every planning session, call `use_skill` with `skill_name: "create-plan"`" (a built-in `create-plan` skill exists).
- Ask: tools "`Read`, `MCP`, `Skill`, `Subagent`, `Mode`", "Allowed subagents | `Explore`".
- Slugs implied by rules docs: `agent`, `plan`, `ask` (`rules-agent/`, `rules-plan/`, `rules-ask/` at https://bob.ibm.com/docs/ide/configuration/rules) — but see §C6 (`/init` writes `rules-code/`).
- "Advanced mode": exists only in IDE 1.x. Changelog 1.0.1: "Advanced mode provides extended capabilities including MCP and browser tools"; changelog 2.0.0: "Advanced and Orchestrator capabilities folded into the defaults." A former sentence on the skills page — "Skills are only available in Advanced mode." — was quoted in feedback issues (https://github.com/IBM/ibm-bob/issues/2687, 2026-06-24; https://github.com/IBM/ibm-bob/issues/174, 2026-04-24) and is **no longer on the page**. There is no "Advanced mode" requirement for skills in the current docs.

### 3.3 Shell custom modes (differences)

Source: https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell (version not stated; content reads as Shell 1.x).
- "Bob Shell uses the same configuration format as Bob IDE, supporting both YAML (preferred) and JSON formats."
- Global path: "Create or edit `~/.bob/custom_modes.yaml`" (**differs from IDE**, §C2). Project: `.bob/custom_modes.yaml`.
- Tool groups: "`read`, `edit` (can be restricted with `fileRegex`), `browser`: Use browser automation, `command`: Execute terminal commands, `mcp`" — a 1.x vocabulary (`command`, `browser`) that the IDE page does not list.
- Precedence: "Command-line arguments (`--chat-mode=mode-slug`) → Project-level modes (`.bob/custom_modes.yaml`) → User-level modes (`~/.bob/custom_modes.yaml`) → System-level modes (platform-specific locations) → Default modes".
- Also `.bobrules-{mode-slug}` single-file fallback and `.bob/rules-{mode-slug}/`.
- Shell tools page and modes page (https://bob.ibm.com/docs/shell/features/modes) show the same Agent/Plan/Ask set with `Execute` naming, matching IDE 2.x.
- User-submitted correction (unverified): https://github.com/IBM/ibm-bob/issues/3606 (2026-09-11) says for Shell 2.0.2: global path is `~/.bob/settings/custom_modes.yaml`; flag is `bob chat --mode <slug>` / `bob run --mode <slug>`; "`command` to `execute` (note `command` as a legacy alias)"; missing groups "`skill`, `todo`, `subagent`, `mode`, and `artifact`"; "Direct `/slug` is not supported in Shell 2.0.2"; "slugs must match `^[a-zA-Z0-9-]+$`". The official Shell CLI reference does list `--mode <mode>` (https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive), which supports point 2.

---

## 4. Slash commands

Source (IDE): https://bob.ibm.com/docs/ide/features/slash-commands (version not stated).
- Directories: "Project-specific: `.bob/commands/` in your workspace root. Global: `~/.bob/commands/` in your home directory." No other directories documented.
- Filename → name: "The filename becomes the command name. For example: `review.md` → `/review`, `test-api.md` → `/test-api`". "Custom commands must be `.md` files". Name processing when created via UI: "Converted to lowercase, Spaces replaced with dashes, Special characters removed, Leading/trailing dashes removed".
- Frontmatter: "`description`: Appears in the command menu … `argument-hint`: Provides a hint about expected arguments". Only these two fields are documented.
- Arguments: "Create a new API endpoint called $1 that handles $2 requests." Positional `$1`/`$2` only; **`$ARGUMENTS` is not documented** (searched all pages: zero hits).
- Precedence: "Custom project commands override global custom commands with the same name". Subdirectories: "Group related commands in subdirectories" (listed under best practices; effect on naming not specified).
- Built-ins: `/init`, `/review`, `/create-pr` (IDE). Mode commands `/agent`, `/plan`, `/ask` (quickstart: "type `/ask` in the chat"; "type `/agent`"; "type `/plan`"). Skills are also invokable as `/skill-name` (see §5).
- Not-found text seen by the model: "The slash command '/unknown-command' was not found."
- Shell page https://bob.ibm.com/docs/shell/features/slash-commands is near-identical and adds: "Cross-platform compatibility: Slash commands work identically across both Bob Shell and Bob IDE … Commands created in one environment can be used in the other". Shell built-ins list `/help /clear /compact /copy /editor /hooks /mode /permissions /resume /settings /mcp /manage-secrets /skills /init /status /team /logs /docs /bug /exit`.
- User-submitted contradiction (unverified): https://github.com/IBM/ibm-bob/issues/3605 (2026-09-11): "Bob Shell slash-commands docs still describe the Bob 1 model (.bob/commands/ → /name). On Shell 2.0.2, that behavior is replaced by the skill migration path." and #3606: "in Shell 2.0 they are migrated to skills, not shown in `/`." Official corroboration is only indirect: IDE changelog 2.0.1 "Workspace command migration now runs safely even if triggered multiple times." See §C7.

---

## 5. Skills

Source (IDE): https://bob.ibm.com/docs/ide/features/skills (version not stated; Skills tab is IDE 2.0.0).
- Directories: "Create a folder inside `.bob/skills/` in your project root, or use `~/.bob/skills/` for global skills. Add a `SKILL.md` file inside that folder."
- Frontmatter: "Required fields: `name`: The skill's display name used in the Bob interface; `description`: A clear summary that helps Bob decide when to activate this skill—skills without descriptions are ignored". "Everything below the `---` delimiter becomes the instructions".
- Extra frontmatter field seen in an official tutorial: https://bob.ibm.com/docs/ide/tutorials/use-skills shows `user-invocable: true` in the SKILL.md and says "The Skill Name is what you type to invoke the skill directly, for example `/changelog-entry`." and "When Allow Bob to use this skill is on, Bob can use the skill on its own when a prompt calls for it, or you invoke it explicitly." The semantics of `user-invocable` are not otherwise documented.
- Nested resources: "You can include additional files and subfolders alongside `SKILL.md` … Bob can read these files automatically once the skill is activated." Example tree includes `scripts/analyze.sh`.
- Precedence: "If both locations contain a skill with the same name, the project-level skill takes precedence."
- Loading: "Skills load once per conversation to avoid duplicate prompts. Bob automatically determines when to activate a skill based on your request and the skill's description."
- Approval: "By default, Bob asks for your permission before activating a skill … Open Bob Settings. Navigate to the Auto-Approve section. Turn on the toggle for Skills." Auto-approve page (https://bob.ibm.com/docs/ide/features/auto-approving-actions) lists action "Skill | Activate skills you have defined | Medium".
- Advanced-mode requirement: none in current docs (see §3.2). Skills need a mode whose `groups` include `skill` (custom-modes page: "`skill`: Load skills"; all three built-ins include `Skill`).
- Creation helpers: tutorial mentions "use the `/create-skill` command in the Bob chat for a guided setup" and the Skills tab "+" button.
- Discovery scoping (IDE 2.1.0 / Shell 2.0.2): "Skills in global skill directories are no longer included in workspace-scoped skill discovery".
- Shared with Shell: Shell skills page https://bob.ibm.com/docs/shell/features/skills is identical in paths/format and says auto-approve is "Via `settings.json`: Add `"autoApprove": { "skills": true }` to your `~/.bob/settings/settings.json`." (**contradicts** the Shell approval-settings schema `approval.allowed_permissions`, §C5). Shell 2.0.3: "Warnings for invalid skill directory names". Shell interactive: "Type `$` followed by a skill name to open the skill picker".
- Historical user report (IDE 1.x era, 2026-05-15): "Skills located in ~/.bob/skills do not appear to be working. Only project-level skills are being seen." https://github.com/IBM/ibm-bob/issues/288 (unverified).

---

## 6. Rules and context

Source (IDE): https://bob.ibm.com/docs/ide/configuration/rules (version not stated).
- Directory form: workspace `.bob/rules/` and `.bob/rules-{mode-slug}/`; global `~/.bob/rules/` ("Linux/macOS: `~/.bob/rules/`; Windows: `%USERPROFILE%\.bob\rules\`"). Table: "`rules/` General rules for all modes; `rules-agent/` Agent mode only; `rules-plan/` Plan mode only; `rules-ask/` Ask mode only; `rules-{mode}/` Any custom mode".
- Priority: "Global rules (`~/.bob/rules/`) → Workspace rules (`.bob/rules/`). Within each level, mode-specific rules load before general rules. Workspace rules can override global rules."
- File behavior: "Recursive reading … Alphabetical order … Automatic filtering: Excludes cache files (`.DS_Store`, `*.bak`, `*.cache`, `*.log`, `*.tmp`, `Thumbs.db`) … Symbolic links: Supported with maximum depth of 5 … Empty files: Silently skipped".
- `.bobrules` single-file forms: the IDE rules page does **not** mention `.bobrules`; the IDE custom-modes page mentions only `.bobrules-{mode-slug}`. The Shell rules page (https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules) documents "`.bobrules` - General workspace rules; `.bobrules-code` - Rules for Code mode; `.bobrules-{modeSlug}`" and says "Bob Shell uses the same custom rules system as IBM Bob IDE."
- `AGENTS.md`: "you can use an `AGENTS.md` file in your workspace root … Automatically loaded by default … Disable with `"bob-code.useAgentRules": false` in settings … Loaded after mode-specific rules but before general workspace rules". Shell equivalent key: `"bob-shell.useAgentRules": false`. Shell additionally documents a hierarchy: "Global context: `~/.bob/AGENTS.md` … Project context: `AGENTS.md` in project root and parent directories … Local context: `AGENTS.md` in subdirectories" (https://bob.ibm.com/docs/shell/configuration/configuring). The IDE docs do not mention `~/.bob/AGENTS.md`.
- `/init`: https://bob.ibm.com/docs/ide/tutorials/start-a-project — "Bob then generates the main `AGENTS.md` file in the … root directory. Bob also creates a `.bob` folder that contains an `AGENTS.md` for each mode." Table: "`.bob/rules-code/AGENTS-code.md` | Agent mode; `.bob/rules-plan/AGENTS-plan.md` | Plan mode; `.bob/rules-ask/AGENTS-ask.md` | Ask mode". Quickstart says "The rule files in `.bob` are where Bob creates `AGENTS.md` for each of its modes: Agent, Plan, and Ask." (**`rules-code` vs `rules-agent`**, §C6.)
- Rules vs modes: https://bob.ibm.com/docs/ide/tutorials/add-bob-capabilities — "Rules … apply to every conversation regardless of mode. A custom mode does not override or bypass rules."

---

## 7. MCP

Source (IDE): https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob (version not stated; settings-panel management is IDE 2.0.0).
- "Global: Stored in `~/.bob/mcp.json`, applies across all workspaces. Project: Stored in `.bob/mcp.json` in your project root, allows team sharing via version control. Project-level configurations take precedence over global settings when server names conflict."
- UI: "Select the MCP tab. … Edit Global MCP: Opens the global `~/.bob/mcp.json` file. Edit Project MCP: Opens the project-specific `.bob/mcp.json` file (Bob creates it if it does not exist). Both files use JSON format with an `mcpServers` object".
- STDIO params: `command` (required), `args`, `cwd`, `env`, `alwaysAllow`, `disabled`. Streamable HTTP: `"type": "streamable-http"`, `url`, `headers`, `alwaysAllow`, `disabled`. SSE (legacy): `url`, `headers`, …
- Auto-approve: "MCP tool auto-approval is disabled by default and works per-tool: Enable the global "Use MCP servers" option in Auto-approving actions … Check Always allow next to the tool name. The global setting takes precedence".
- Project scope example (IDE tutorial https://bob.ibm.com/docs/ide/tutorials/mcp-server-integration) uses `"args": ["${workspaceFolder}/arxiv-server/build/index.js"]` — `${workspaceFolder}` substitution shown but not formally documented. Same tutorial says "Global: Stored in `mcp_settings.json`" and "remove the `arxiv-server` block from `mcp_settings.json` (global scope)". **Contradiction §C3.**
- Shell (https://bob.ibm.com/docs/shell/configuration/mcp/mcp-bobshell): "Global configuration: Settings in `<USER_HOME>/.bob/mcp_settings.json` apply to all workspaces. Project-level configuration: Settings in `.bob/mcp.json`". Shell uses `httpURL` for Streamable HTTP (no `type` key) and `timeout` in ms. Shell OAuth/transport pages repeat `~/.bob/mcp_settings.json`. A user says (unverified) the real Shell global file is `<USER_HOME>/.bob/settings/mcp.json` (https://github.com/IBM/ibm-bob/issues/3643, 2026-09-14).

---

## 8. Subagents and agent personas

### 8.1 Subagents (IDE 2.0.0+)

Source: https://bob.ibm.com/docs/ide/features/subagents and https://bob.ibm.com/docs/ide/core-concepts/tools.
- Tool: "`spawn_subagent` | Create an independent agent with its own context window".
- Isolation: "It runs in its own isolated context window … It does not share state, files, or tool results with Bob unless Bob explicitly passes them in the description." "By default, a subagent does not see the parent conversation history … Bob can set `fork_context: true`".
- Types: "`explore` | Read-only codebase exploration, runs on a lighter model; `general` | Full tool access, runs on the default model".
- Approval: "You are prompted to approve the spawn before it starts. Bob waits until you confirm." (auto-approvable via the "Subagent" action, risk "Low").
- Parallelism (IDE): "Parallel subagents panel: When multiple subagents run at the same time — for example, during a workflow that spawns several specialized agents in parallel — they are grouped into a single collapsible panel". Landing page: "Bob can break complex tasks into parallel workstreams by spawning specialized subagents." Changelog 2.0.0 says the same. **The Shell subagents page has no "Parallel subagents panel" section** (https://bob.ibm.com/docs/shell/features/subagents); Shell parallel fan-out is not documented either way.
- Mode gating: "The mode you are working in controls which subagent types Bob is permitted to spawn … If a subagent spawn is not permitted by the active mode, Bob will complete the work directly without spawning." Custom modes gate via `allowedSubagents`.
- Subtasks: "`start_subtask` | Create a new task with a title, instructions, and optional todo list"; "A subtask is a fully independent task that appears in the UI with its own breadcrumb and conversation history"; can be given "An optional mode to start it in".
- Shell settings: `session.subagents` (default `true`), CLI `--disable-subagents`.

### 8.2 Agent personas (`.bob/agents/`) — documented, then unpublished

- Status: `https://bob.ibm.com/docs/ide/configuration/agent-personas` returned **404** on 2026-09-16, as did `/docs/shell/configuration/agent-personas`. Both slugs are still present in the site's navigation payload (`fallback:ide/configuration/agent-personas.mdx`, `fallback:shell/configuration/agent-personas.mdx`, with the description "Create reusable persona files that shape a subagent's role, focus, and tool access."). A feedback issue shows the page was live on 2026-08-20 (https://github.com/IBM/ibm-bob/issues/3055) and a 2026-09-14 issue reports the subagents page's link "For setup instructions and examples, see Agent personas." now 404s (https://github.com/IBM/ibm-bob/issues/3644). The IDE 2.0.2 changelog's safe-mode list ("configuration, skills, **agents**, rules, and MCP servers") and the Shell trusted-folders table ("Subagents | Custom subagents from the project folder are unavailable") both presuppose project-level agent files.
- Content, from the Wayback Machine capture of 2026-08-31 (`https://web.archive.org/web/20260831080238id_/https://bob.ibm.com/docs/ide/configuration/agent-personas`), verbatim:
  - "Agent personas are markdown files that configure the role and behavior of a spawned subagent."
  - "When Bob spawns a subagent, it checks `.bob/agents/` for a persona file whose description matches the task. If one is found, the persona is loaded as the subagent's mode: the role body is injected into the subagent's system prompt and layers on top of its base instructions."
  - Format: YAML front matter `name` (Yes, "Should match the filename without `.md`"), `description` (Yes, "Bob uses this to match the persona to a task"), `tools` (No, list, "Constrains which tool groups the subagent can use. Omit to inherit defaults."), then free-form role body.
  - "The `tools` field accepts the same groups as custom modes: `read`, `edit`, `command`, `browser`, `mcp`." "The `tools` field is a ceiling, not a grant."
  - Placement: "`<project>/.bob/agents/` | This project only … `~/.bob/agents/` | All projects on this machine … If both locations contain a persona with the same name, the project-level file takes precedence." Example tree: `.bob/agents/code-reviewer.md`, `.bob/agents/pr-summariser.md`, `.bob/skills`, `.bob/custom_modes.yaml`.
  - Invocation: "Use the code-reviewer persona to review the files in src/auth/." Inline personas in the prompt also work. "Bob infers `fork_context: true` from phrases like "what we discussed"".
  - Note the tool vocabulary on this page (`command`, `browser`) does not match the current IDE custom-modes vocabulary (`execute`, no `browser`) — §C2.
- Treat `.bob/agents/` as: documented for IDE by a page IBM has since withdrawn; version not stated; whether the current 2.1.0 build still reads it is **unknown** from the docs.

---

## 9. Lifecycle hooks, workflows, subtasks, artifacts

### 9.1 Hooks (IDE 2.0.2+; Shell 2.0.2+)

Source: https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks and https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks.
- Files: "Global (all workspaces) `~/.bob/settings/settings.json`; Workspace (current project) `.bob/settings.json`" (both products). "Global hooks always run. Workspace hooks are merged on top of global hooks".
- Schema (both): `{"hooks":{"PreToolUse":[{"matcher":"^write_file$","hooks":[{"type":"command","command":"sh .bob/hooks/check.sh","timeout":5}]}]}}`; `matcher` is a regex on the tool name (Pre/PostToolUse only); default `timeout` 10 s.
- Events, IDE: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`. "Only `command` hooks and the five hook types listed above are supported in this release."
- Events, Shell 2.0.3: adds `PreCompact`, `PostCompact`, and `type: "https"` with `url`. IDE lacks these (as of 2.1.0 docs).
- Shell trust: "Workspace hooks only run in trusted folders."
- Enterprise: "`EnforcedHooks` policy" (IDE 2.1.0 / Shell 2.0.2).

### 9.2 Workflows (IDE)

- Tool: https://bob.ibm.com/docs/ide/core-concepts/tools — "`start_workflow` | Launch a named workflow with its own structured steps | Create a pull request, run a code review". "Workflows are curated step-by-step processes for common tasks."
- Mode group: custom-modes page lists "`workflow`: Launch pre-defined workflows".
- Changelog 2.0.0: "Review workflow: A built-in code review workflow"; "Nested workflows: Workflows can now invoke other workflows".
- Premium packages ship workflows (https://bob.ibm.com/docs/ide/premium-packages/bob-for-i/workflows): "A workflow can be started directly by selecting the Start Workflow button at the top of the chat".
- **No user-authorable workflow file format or directory is documented anywhere** (searched for `workflows/`, YAML/JSON workflow schema: zero hits). Shell tools page does not list `start_workflow`/`workflow`, and Shell's custom-mode groups do not include `workflow`.

### 9.3 Subtasks, todo, artifacts, Office

- `start_subtask` and `update_todo_list` (IDE tools page). Shell approval groups include `subtask` and `todo`.
- Artifacts: IDE changelog 2.1.0 — "The `create_html_artifact` tool is no longer invoked for general formatting or code output. It is reserved for shareable one-page summaries of completed work". No `artifact` tool group is documented for modes; no Shell mention of `create_html_artifact`.
- Symbol tools (IDE tools page): `GetSymbolsOverview`, `FindSymbol`, `FindReferencingSymbols`; Shell docs do not list them (Shell tools page not itemized the same way).
- Shell-only: `bob acp`, background processes (2.0.3), `--format json|stream-json`, `--max-cost`, `--disable-tool-groups <groups>` "(comma-separated, for example `execute,mcp`)", `bob mcp add|add-json|remove|list`.

---

## 10. Explicit statements about Shell ↔ IDE sharing of `~/.bob`

Explicit:
1. Approval settings file is shared: "The `approval` key in `~/.bob/settings/settings.json` … This file is shared with the IDE; changes made through the IDE settings UI are written to the same file." — https://bob.ibm.com/docs/shell/configuration/approval-settings (Shell 2.0.x).
2. Slash commands: "Slash commands work identically across both Bob Shell and Bob IDE … Commands created in one environment can be used in the other" — https://bob.ibm.com/docs/shell/features/slash-commands.
3. Rules: "Bob Shell uses the same custom rules system as IBM Bob IDE." — https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules.
4. Modes: "Bob Shell uses the same configuration format as Bob IDE" and "Custom modes in Bob Shell work similarly to Bob IDE modes." — https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell. (Same format; global file path differs per the two pages.)
5. MCP `alwaysAllow` in `.bob/mcp.json`: "Previously, this setting was honored only in the IDE extension." — Shell changelog 2.0.1 (implies the same project file is read by both).
6. Skills: same paths on both pages (`.bob/skills/`, `~/.bob/skills/`); no explicit sharing sentence.
7. Hooks: same two files on both pages (`~/.bob/settings/settings.json`, `.bob/settings.json`); no explicit sharing sentence.
8. Windows path: rules pages give `%USERPROFILE%\.bob\rules\` for both products.

Not stated anywhere: whether `~/.bob/settings/custom_modes.yaml`, `~/.bob/mcp.json` / `mcp_settings.json`, or `~/.bob/agents/` are read by both products.

---

## Contradictions (record of both sides)

- **C1. Extension vs standalone app.** `https://bob.ibm.com/llms.txt`: "Install Bob extension for VS Code" and lists Code/Ask/Plan/Advanced/Orchestrator modes. Quickstart (https://bob.ibm.com/docs/ide/getting-started/quickstart): "Bob is a standalone IDE application and not an extension." Docs tracker issue template labels it "Bob IDE (VS Code Extension)". Reconciliation supported by the changelog ("VS Code engine uplift") and reset page: Bob IDE is a VS Code-based standalone app bundling a `bob-code` extension. llms.txt is stale (1.x).

- **C2. Custom-mode tool-group vocabulary and global file path.**
  - IDE custom-modes (https://bob.ibm.com/docs/ide/configuration/custom-modes): groups `read, edit, execute, mcp, skill, workflow, todo, subtask, subagent, mode`; global file `~/.bob/settings/custom_modes.yaml`.
  - Shell custom-modes (https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell): groups `read, edit, browser, command, mcp`; global file `~/.bob/custom_modes.yaml`.
  - Removed IDE agent-personas page (Wayback 2026-08-31): "the same groups as custom modes: `read`, `edit`, `command`, `browser`, `mcp`".
  - Historical IDE page (quoted in https://github.com/IBM/ibm-bob/issues/2544, 2026-06-09): "browser: Use browser automation" was listed on the IDE custom-modes page; feedback: "Use Browser tool is not available for customers."
  - User correction for Shell 2.0.2 (https://github.com/IBM/ibm-bob/issues/3606): global path should be `~/.bob/settings/custom_modes.yaml`; `command` is a legacy alias of `execute`; also names an `artifact` group.
  - Installer implication: emit `execute` (IDE-documented); the docs are silent on whether `command` is accepted as an alias.

- **C3. Global MCP file name (three variants).**
  - `~/.bob/mcp.json` — IDE mcp-in-bob page.
  - `mcp_settings.json` (no directory) — IDE MCP tutorial (https://bob.ibm.com/docs/ide/tutorials/mcp-server-integration): "Global: Stored in `mcp_settings.json`".
  - `<USER_HOME>/.bob/mcp_settings.json` / `~/.bob/mcp_settings.json` — Shell MCP, OAuth, and transports pages.
  - `~/.bob/settings/mcp.json` — user reports only (https://github.com/IBM/ibm-bob/issues/3643 for Shell; https://github.com/IBM/ibm-bob/issues/3647 says IDE 2.1.0's own agent prompt targets `~/.bob/settings/mcp.json`).
  - Project file `.bob/mcp.json` is consistent everywhere.

- **C4. Shell user settings path.** Configuring page: `~/.bob/settings/settings.json` (also changelog 2.0.0). Shell troubleshooting page (https://bob.ibm.com/docs/shell/troubleshooting/troubleshoot): "User settings: `~/.bob/settings.json`".

- **C5. Shell skills auto-approve key.** Shell skills page: `"autoApprove": { "skills": true }` in `~/.bob/settings/settings.json`. Shell approval-settings page: `"approval": { "allowed_permissions": [ … "skill" … ] }` in the same file.

- **C6. Agent-mode rules directory slug.** IDE rules page: "`rules-agent/` Agent mode only". IDE `/init` tutorial: "`.bob/rules-code/AGENTS-code.md` | Agent mode" (and quickstart says the mode is "Agent"). Shell rules page: "`rules-code/` Code mode only". Changelog 1.0.2 also refers to "rules-advanced". So `code` (1.x slug) and `agent` (2.x slug) both appear; which slug the 2.x loader keys on for mode-specific rules is not stated.

- **C7. Do `.bob/commands/*.md` still work in Shell 2.0?** Official Shell page: yes, identical to IDE. User reports (#3605, #3606, 2026-09-11): in Shell 2.0.2 commands are "migrated to skills, not shown in `/`". IDE changelog 2.0.1 mentions "Workspace command migration". Unresolved.

- **C8. Hook event sets differ.** IDE (2.1.0 docs): 5 events, `command` only. Shell (2.0.3): 7 events (+`PreCompact`, `PostCompact`), `command` + `https`.

- **C9. Built-in mode names.** Current IDE/Shell pages: Agent/Plan/Ask. llms.txt, Shell custom-modes examples (`/mode code`), Shell rules page (`.bobrules-code`), IDE 1.x changelog: Code/Ask/Plan/Advanced/Orchestrator.

- **C10. Mode groups needed for skills.** Feedback issue #174 (2026-04-24) quotes the then-current IDE skills page: "Skills are only available in Advanced mode." Current page has no such sentence; custom-modes page says skills need the `skill` group.

---

## Not documented (searched for, not found)

- Any IDE storage location other than `~/.bob` (no `globalStorage`, no `%APPDATA%`, no macOS `Application Support` path). Where the IDE keeps its "state and secret storage" (reset page) is not named.
- `$ARGUMENTS` (or any all-args placeholder) for slash commands; only `$1`, `$2` shown.
- Any slash-command frontmatter beyond `description` and `argument-hint` (no `allowed-tools`, `model`, `mode`).
- Any SKILL.md frontmatter beyond `name`, `description` (except `user-invocable: true` appearing once in a tutorial without definition); no `allowed-tools`, `effort`, `argument-hint`, `model`; no max description length.
- Whether a skill can invoke a slash command, a workflow, or another skill programmatically.
- A user-authorable workflow format/directory for `start_workflow` / the `workflow` mode group.
- Whether Shell honors the `workflow`, `subtask`, `artifact` groups; whether IDE honors `command`/`browser` as aliases.
- An `artifact` tool group (only `create_html_artifact` tool is named, IDE 2.1.0).
- The list of built-in "subagent presets" that `allowedSubagents` accepts (only `Explore`/`All` appear in the built-in mode tables; `explore`/`general` are the documented subagent types).
- Whether Bob Shell supports parallel subagent fan-out (IDE docs describe a "Parallel subagents panel"; Shell page omits it).
- Whether the IDE 2.1.0 build still reads `.bob/agents/` (page withdrawn; no changelog entry announcing removal).
- Whether `~/.bob/settings/custom_modes.yaml`, the global MCP file, or `~/.bob/agents/` are shared between IDE and Shell.
- The IDE "workspace trust" page (`/docs/ide/security/workspace-trust`, linked from the 2.0.2 changelog) — 404; never archived. The IDE `/permissions` command and trust file location are therefore undocumented for the IDE (Shell uses `~/.bob/trustedFolders.json`).
- Other nav-listed but unpublished IDE pages (all 404 on 2026-09-16): `/docs/ide/security/security-hardening`, `/docs/ide/configuration/marketplace`, `/docs/ide/configuration/carbon-modes/*`, `/docs/ide/premium-packages/devsecops/*`, `/docs/ide/troubleshooting/ts-extension-conflicts`, `/docs/ide/troubleshooting/ts-litellm-fail`.
- FAQ answer bodies (https://bob.ibm.com/docs/ide/faq, https://bob.ibm.com/docs/shell/faq) are client-rendered accordions not present in the served HTML; only question titles were retrievable (e.g. "Does Bob have a CLI or headless mode for server-side or pipeline use?", "How are Bob client updates managed?").
- Headless/CI skill auto-activation behavior in `bob run` (non-interactive page documents flags and output formats but not skill activation).
- `BOB_CONFIG_DIR` or any env override for `~/.bob` (zero hits in all pages).

---

## Practical summary for the installer (facts only, from the above)

- Write skills to `.bob/skills/<name>/SKILL.md` (project) or `~/.bob/skills/<name>/SKILL.md` (global) with only `name` + `description` in frontmatter; optionally `user-invocable: true`. Both products.
- Write commands to `.bob/commands/<name>.md` / `~/.bob/commands/<name>.md`, frontmatter `description` + `argument-hint`, body with `$1`/`$2`. Both products per official docs (Shell 2.0 behavior disputed by users).
- Write custom modes to `.bob/custom_modes.yaml` (project, both products) and, for the IDE, `~/.bob/settings/custom_modes.yaml`; the Shell page says `~/.bob/custom_modes.yaml` (disputed). Use `groups` with the IDE vocabulary (`read`, `edit`+`fileRegex`, `execute`, `mcp`, `skill`, `workflow`, `todo`, `subtask`, `subagent`, `mode`); omit nothing you need — "If you omit `groups`, the mode does not get any grouped tools."
- Mode-specific rules: `.bob/rules-{slug}/*.md` (preferred) or `.bobrules-{slug}`; general rules `.bob/rules/`, `~/.bob/rules/`.
- MCP: project `.bob/mcp.json` (`mcpServers`, `command/args/cwd/env/alwaysAllow/disabled`, or `type: streamable-http` + `url` for IDE); global file name is contested (`~/.bob/mcp.json` per IDE page).
- Agent personas: `.bob/agents/<name>.md` and `~/.bob/agents/<name>.md` with `name`, `description`, optional `tools` list — from a withdrawn page; current support unknown.
- Hooks: `hooks` key in `.bob/settings.json` / `~/.bob/settings/settings.json`.
- Untrusted-folder safe mode (IDE 2.0.2+, Shell when enabled) suspends workspace-sourced skills, agents, rules, modes, MCP; global `~/.bob` items still load.

## Source list

IDE: /docs/ide, /docs/ide/changelog, /getting-started/install, /getting-started/quickstart, /getting-started/migrating, /getting-started/best-practices, /configuration/custom-modes, /configuration/rules, /configuration/lifecycle-hooks, /configuration/bobignore, /configuration/mcp/mcp-in-bob, /configuration/mcp/server-transports, /configuration/mcp/mcp-oauth, /core-concepts/tools, /core-concepts/context-window-management, /core-concepts/large-projects, /features/modes, /features/skills, /features/slash-commands, /features/subagents, /features/auto-approving-actions, /features/chat-interface, /security/bob-security-guidance, /troubleshooting/ts-reset-application, /tutorials/start-a-project, /tutorials/use-skills, /tutorials/add-bob-capabilities, /tutorials/standardize-bobs-behavior, /tutorials/mcp-server-integration, /tutorials/document-repositories-with-custom-modes-practical-workflow, /premium-packages/* (bob-for-i workflows/skills/slash-commands/modes/settings, pkg-index, updating-premium-packages). All under https://bob.ibm.com.
Shell: /docs/shell, /changelog, /getting-started/install-and-setup, /getting-started/start-bobshell-interactive, /getting-started/start-bobshell-non-interactive, /getting-started/uninstalling-bobshell, /getting-started/best-practices, /configuration/configuring, /configuration/custom-modes-bobshell, /configuration/bobshell-custom-rules, /configuration/approval-settings, /configuration/lifecycle-hooks, /configuration/mcp/mcp-bobshell, /configuration/mcp/mcp-oauth, /configuration/mcp/server-transports, /configuration/ignoring-files, /features/modes, /features/skills, /features/slash-commands, /features/subagents, /features/auto-approving-actions, /features/acp, /security/trusted-folders, /troubleshooting/troubleshoot.
Other: https://bob.ibm.com/llms.txt, https://bob.ibm.com/releases, https://bob.ibm.com/sitemap.xml, Wayback capture 20260831080238 of /docs/ide/configuration/agent-personas, github.com/IBM/ibm-bob issues #174, #288, #2544, #2687, #3055, #3605, #3606, #3643, #3644, #3647, #3591, #2980 (docs feedback; user-submitted, unverified).
