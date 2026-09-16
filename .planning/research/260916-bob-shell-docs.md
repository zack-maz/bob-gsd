# IBM Bob Shell — what it reads on disk, per version (sourced)

Research date: 2026-09-16. All quotes are verbatim from the page at the URL given, fetched that day. "Version" is the Bob Shell version the page/claim applies to; docs pages are unversioned, so unless a page names a version the honest label is **"version not stated (current docs, describe 2.0.x)"**. Where the docs are silent on 1.0.x, the 1.0.x column comes from a read-only inspection of the locally installed `bobshell@1.0.4` npm package (`/opt/homebrew/lib/node_modules/bobshell/bundle/bob.js`, `bob --help`, `bob mcp add --help`) and is labelled **[local 1.0.4 binary]**. That is evidence of what 1.0.4 does, not documentation.

Sitemap note: the sitemap (https://bob.ibm.com/sitemap.xml) lists 40 Shell pages and 98 IDE pages; none carry `<lastmod>`. Every Shell page was fetched. No versioned docs archive (for 1.0.x) exists on the site.

---

## 0. Quick answer table for the installer maintainer

| Artifact you write | Bob Shell 1.0.x | Bob Shell 2.0.x (2.0.0 – 2.0.3 documented; 2.0.4 exists) | Source |
|---|---|---|---|
| Global settings file | `~/.bob/settings.json` [local 1.0.4 binary + local disk] | `~/.bob/settings/settings.json` (changelog 2.0.0: "Settings are now stored at ~/.bob/settings/settings.json") | §2 |
| Project settings file | `.bob/settings.json` [local 1.0.4 binary] | `.bob/settings.json` | §2, §9 |
| Global custom modes | `~/.bob/settings/custom_modes.yaml` (1.0.4 auto‑migrates `~/.bob/custom_modes.yaml` → `settings/`) [local 1.0.4 binary] | Shell docs page says `~/.bob/custom_modes.yaml`; IDE docs page says `~/.bob/settings/custom_modes.yaml` — **contradiction, see §12** | §3 |
| Project custom modes | `.bob/custom_modes.yaml` (1.0.4 migrates legacy `.bobmodes`) | `.bob/custom_modes.yaml` | §3 |
| Slash commands | `~/.bob/commands/*.md`, `.bob/commands/*.md` [local 1.0.4 binary] | same (documented) | §4 |
| Skills | **not supported** ("Skills were not available in Bob Shell 1.0.x"; bundle has zero `SKILL.md`/`skills` strings) | `~/.bob/skills/<name>/SKILL.md`, `.bob/skills/<name>/SKILL.md` | §5 |
| Rules | `~/.bob/rules/`, `.bob/rules/`, `rules-{mode}/`, `.bobrules`, `.bobrules-{mode}` (+ `.roorules`, `.clinerules` fallbacks) [local 1.0.4 binary] | `~/.bob/rules/`, `.bob/rules/`, `.bob/rules-{mode}/`, `.bobrules`, `.bobrules-{mode}` | §6 |
| AGENTS.md | `AGENTS.md` in workspace root [local 1.0.4 binary] | `~/.bob/AGENTS.md`, `AGENTS.md` root/parents/subdirs | §6 |
| Global MCP config | `~/.bob/settings/mcp_settings.json` (migrated from `~/.bob/mcp_settings.json`) [local 1.0.4 binary] | Shell docs: `~/.bob/mcp_settings.json`; IDE docs: `~/.bob/mcp.json` — **contradiction, see §12** | §7 |
| Project MCP config | `.bob/mcp.json` | `.bob/mcp.json` | §7 |
| Agent persona files (`.bob/agents/`) | not present | **not documented anywhere** | §8, §13 |
| Lifecycle hooks | not present (no `PreToolUse` string in 1.0.4 bundle) | `hooks` key in `~/.bob/settings/settings.json` and `.bob/settings.json` | §9 |
| Tool‑group vocabulary in modes | `--chat-mode` choices `plan, code, advanced, ask` [local 1.0.4 binary]; Shell custom‑modes page lists `read, edit, browser, command, mcp` | `read, edit, execute, mcp, skill, workflow, todo, subtask, subagent, mode` (IDE page) vs `read, edit, browser, command, mcp` (Shell page) — **contradiction, see §12** | §3 |

---

## 1. Install, requirements, version history

### 1.1 Requirements
- **Node.js floor (2.0.x docs):** "Node.js — Version 24 or later" — https://bob.ibm.com/docs/shell/getting-started/install-and-setup — version not stated on page, but page is for 2.0.x (it carries the 2.0.0 upgrade banner).
- **Node.js floor (1.0.4 actual):** `package.json` `"engines":{"node":">=20.0.0"}` — [local 1.0.4 binary].
- **z/OS / IBM Z:** "Node.js version 24 or later" — https://www.ibm.com/docs/en/bobz/3.0.0?topic=z-installing-using-bob-shell — page says "This feature is available from IBM Bob version 2.0.2+".
- OS: "macOS, Linux, Windows, z/OS UNIX System Services (os390-s390x), or Linux on IBM Z"; "Minimum 4 GB RAM (8 GB recommended)"; "Minimum 500 MB available disk space" — install page above.

### 1.2 Install methods
- Script: `curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash` (macOS/Linux); `powershell -c "irm -Uri https://bob.ibm.com/download/bobshell.ps1 | iex"` (Windows) — https://bob.ibm.com/docs/shell/getting-started/install-and-setup.
- Package managers from a downloaded tarball (Releases page https://bob.ibm.com/releases?bob=shell): "npm install --registry=https://registry.npmjs.org/ -g "<full-absolute-file-path>"", pnpm, yarn variants — IBM Z page above; the main install page shows npm/pnpm/yarn tabs with "You must revise the following commands to use the actual path where you downloaded the file."
- npm package name is `bobshell` (uninstall: "npm uninstall -g bobshell" — https://bob.ibm.com/docs/shell/getting-started/uninstalling-bobshell). It is **not** on the public npm registry (`npm view bobshell` → E404, checked 2026-09-16).
- Uninstall removes config with "rm -rf ~/.bob" (same page; "This permanently deletes your Bob Shell settings and any saved data").

### 1.3 Major upgrade requires fresh install
- "Upgrading from Bob Shell 1.0.x: Bob Shell 2.0.0 requires a fresh install. Currently there is no automated upgrade path from 1.0.x. Your existing settings and configurations will be preserved during the install." — https://bob.ibm.com/docs/shell/getting-started/install-and-setup and https://bob.ibm.com/docs/shell (applies to 1.0.x → 2.0.0).

### 1.4 Latest version and history
- Releases page https://bob.ibm.com/releases?bob=shell (JS‑rendered; text extracted from HTML) lists Bob Shell: **"2.0.4 Latest"**, 2.0.3, 2.0.2, 2.0.1, 2.0.0, 1.0.6, 1.0.5, 1.0.4, 1.0.3, 1.0.1. (No 1.0.2 download; no dates on the page.)
- **The changelog stops at 2.0.3.** https://bob.ibm.com/docs/shell/changelog has no 2.0.4 entry (checked 2026-09-16). What 2.0.4 changes is **unknown**.

Changelog (https://bob.ibm.com/docs/shell/changelog), verbatim headings/dates:

| Version | Date (changelog) | Installer‑relevant items (verbatim) |
|---|---|---|
| 2.0.3 | September 2026 | "Compaction lifecycle hooks — You can now run hooks before and after context compaction. Use PreCompact to block compaction when conditions are not met, and PostCompact to act after compaction completes." / "MCP OAuth authentication … Non-interactive session support is planned for a future release." / "HTTPS hook handlers" / "Warnings for invalid skill directory names — Bob now warns you when a skill directory name is invalid" / "Unified /compact slash command" / "--disable-mcp flag behavior corrected" / "Git fsmonitor disabled in untrusted folders" |
| 2.0.2 | August 2026 | "Agent Client Protocol (ACP) — Run bob acp …" / "Hooks management — Run /hooks …" / "z/OS and Linux on IBM Z support" / "Enforce hooks across all users with a policy — Administrators can now use the EnforcedHooks policy" / "Global skill directories excluded from workspace scope — Skills in global skill directories are no longer included in workspace-scoped skill discovery" / office_read/office_edit tools |
| 2.0.1 | August 2026 | "MCP tools listed in alwaysAllow inside .bob/mcp.json are now automatically approved on the first tool call of a task in Bob Shell. Previously, this setting was honored only in the IDE extension." / "Settings changes always require explicit approval — Writes to .bob/settings.json and ~/.bob/*/settings.json now always require one-time explicit user approval, even when auto-approve is enabled." / "Auto-approve blocked for Bob home directory writes — Tool calls that write to Bob's home directory (for example, ~/.bob/) are no longer automatically approved" / "Workspace root resolved correctly from subdirectories — Bob Shell now prioritizes .git over .bob when walking up the directory tree to find the workspace root. Starting Bob Shell from inside a package subdirectory that contains its own .bob/ folder no longer causes workspace-scoped skills, rules, and modes to be silently missed." / "Deprecated --list-sessions and --limit flags restored … as silent aliases for --list-tasks" / "Increased MCP tool payload limit … 300 KB" / aliases /history /compact /trust /info |
| 2.0.0 | August 2026 | "MCP management commands — Manage Model Context Protocol servers directly from the CLI with bob mcp add, bob mcp add-json, bob mcp remove, and bob mcp list. Supports both global and workspace scopes, and stdio, SSE, and HTTP transports." / "Skills — … Skills were not available in Bob Shell 1.0.x." / "Redesigned settings schema — Settings are now stored at ~/.bob/settings/settings.json. The schema adds a telemetry section, an edit tool group, and clearer per-setting documentation. CLI flags and the /settings slash command override file values for the current session." / "Agent mode replaces Code and Advanced modes — The previous Code mode and Advanced mode have been consolidated into a single Agent mode." / "Expanded non-interactive output schema — The JSON output from bob run now includes a stats object …" / "Message queue" |
| 1.0.6 | July 2026 | "Custom identity provider support" |
| 1.0.5 | June 2026 | "Support for additional data centers"; security fixes |
| 1.0.4 | May 2026 | "Authentication token refresh"; "Default authentication method" fixes |
| 1.0.3 | April 2026 | "API key authentication — … Use an API key in non-interactive mode for CI/CD pipelines" |
| 1.0.2 | April 2026 | "Minor bug fixes" |
| 1.0.1 | March 2026 | Initial: "Specialized modes … Code mode … Ask mode … Plan mode … Advanced mode provides extended capabilities including MCP tools." / "Custom modes and slash commands — … Define custom modes for specialized workflows. Create reusable command shortcuts." / "MCP (Model Context Protocol) integration" |

Blog confirmation of the 2.0 cut‑over: "Shell now runs on the same agent foundation as Bob IDE, bringing Skills, Subagents, and better execution of long-running tasks to terminal sessions." and the CLI gains `bob chat`, `bob run`, `bob mcp` — https://bob.ibm.com/blog/august-2026-release/ (post dated August 5, 2026 per the fetch).

Bob IDE version pairing (for cross‑reference): IDE changelog https://bob.ibm.com/docs/ide/changelog — 2.1.0 (August 2026), 2.0.3 (August 2026), 2.0.2 (August 2026; adds "Command lifecycle hooks … Define hooks in .bob/settings.json in your workspace or globally in ~/.bob/settings/settings.json" and "Workspace trust"), 2.0.1 (July 2026), 2.0.0 (June 2026; "Simplified default modes — Bob now ships with three focused default modes: Plan, Agent, and Ask … with Advanced and Orchestrator capabilities folded into the defaults"), 1.0.3 (May 2026), 1.0.2 (April 2026), 1.0.1 (March 2026).

---

## 2. Config home and settings

### 2.1 `~/.bob` layout (2.0.x, documented)
- "Bob Shell stores settings in two locations: User (all workspaces) ~/.bob/settings/settings.json; Project (current workspace) <workspace>/.bob/" — https://bob.ibm.com/docs/shell/configuration/configuring — 2.0.x (changelog 2.0.0 says this path is new in 2.0.0).
- "CLI flags always override file values for the current session. You can also change settings interactively with the /settings slash command inside bob chat." — same page.
- "Authentication tokens (OAuth) are stored separately in ~/.bob/settings/auth-secrets.json." — same page.
- "Logs are written to ~/.bob/logs/shell/ using rotating files (bob-<timestamp>.log). Up to 10 log files are retained … maximum log file size is 5 MB" — same page.
- Secrets: "Secrets are stored encrypted in ~/.bob/settings/ and can be referenced in MCP server configurations using ${KEY} syntax." — https://bob.ibm.com/docs/shell/features/slash-commands (`/manage-secrets set KEY VALUE`, `list`, `rm KEY`).
- Trust store: "Your choice is saved in ~/.bob/trustedFolders.json" — https://bob.ibm.com/docs/shell/security/trusted-folders.
- Approval config: "The approval key in ~/.bob/settings/settings.json controls which tool groups and individual tools are automatically approved. This file is shared with the IDE; changes made through the IDE settings UI are written to the same file." — https://bob.ibm.com/docs/shell/configuration/approval-settings.

### 2.2 Settings schema (2.0.x)
Verbatim from https://bob.ibm.com/docs/shell/configuration/configuring:
```json
{
 "session": { "maxTurns": 50, "defaultMode": "agent", "mcp": true, "subagents": true },
 "logging": { "logLevel": "warn" },
 "tasks": { "retentionDays": 30 },
 "telemetry": { "enabled": true }
}
```
Documented keys: `session.maxTurns`, `session.defaultMode` ("agent"), `session.mcp`, `session.subagents`, `logging.logLevel` (error, warn, info, debug, trace), `tasks.retentionDays` ("Only set tasks.retentionDays to 0 in Bob Shell 2.0.1 or later"), `telemetry.enabled`, `telemetry.excludePayload` ("IBM users: exclude conversation payload from telemetry"). Other keys documented elsewhere: `approval` (§ approval page), `hooks` (§9), `autoApprove.skills` (§5), `security.folderTrust.enabled` (trusted‑folders page: "setting security.folderTrust.enabled to true in ~/.bob/settings/settings.json. A restart is required"), `"bob-shell.useAgentRules": false` (rules page). The Shell custom‑modes page also shows a `"tools": {"allowed": ["run_shell_command(git status)", …]}` block — see §3.5; that key is not in the settings schema page.

### 2.3 Contradiction on the user settings path (record both)
- https://bob.ibm.com/docs/shell/troubleshooting/troubleshoot: "Project settings: .bob/settings.json in your project directory; User settings: ~/.bob/settings.json in your home directory" and precedence "Command-line arguments (highest priority); Environment variables; Project settings; User settings; System defaults (lowest priority)".
- vs. https://bob.ibm.com/docs/shell/configuration/configuring: "~/.bob/settings/settings.json".
- The 2.0.1 changelog phrase "Writes to .bob/settings.json and ~/.bob/*/settings.json" implies the settings file sits one directory below `~/.bob/` in 2.0.x. The troubleshooting page most likely reflects 1.0.x, which is consistent with the local 1.0.4 install (`~/.bob/settings.json` exists at the root; `~/.bob/settings/` exists but is empty) and the 1.0.4 bundle (`getGlobalSettingsPath(){return du.join(t.getGlobalGeminiDir(),"settings.json")}` where the global dir is `homedir()/.bob`). — [local 1.0.4 binary]

### 2.4 Environment variables
Documented (2.0.x):
- `BOB_API_KEY` — "Set the BOB_API_KEY environment variable with your API key value" — https://bob.ibm.com/docs/shell/getting-started/install-and-setup.
- `BOBSHELL_API_KEY` — "If BOBSHELL_API_KEY is set in the environment that launches bob acp, Bob uses the key" — https://bob.ibm.com/docs/shell/features/acp (2.0.2+). Note: the install page says `BOB_API_KEY`, the ACP page says `BOBSHELL_API_KEY`; whether both work is **not stated**. The 1.0.4 bundle only knows `BOBSHELL_API_KEY` (43 occurrences) and `BOBSHELL_API_KEY_STDIN` — [local 1.0.4 binary].
- `BOB_LOG_LEVEL` — "Use --log-level debug (or BOB_LOG_LEVEL=debug)" — configuring page.
- `BOB_SHELL_CLI_IDE_SERVER_PORT` — troubleshooting page (dev‑container port forwarding).
- `NODE_EXTRA_CA_CERTS` — troubleshooting page (corporate CA).
Found only in the 1.0.4 binary (undocumented) — [local 1.0.4 binary]: `BOB_SHELL_CLI_SYSTEM_SETTINGS_PATH` (else defaults `/Library/Application Support/Bob-Shell/settings.json` on darwin, `C:\ProgramData\bob-shell\settings.json` on win32, `/etc/bob-shell/settings.json` otherwise), `BOB_SHELL_CLI_TRUSTED_FOLDERS_PATH` (overrides `~/.bob/trustedFolders.json`), `BOB_SHELL_CLI_SYSTEM_DEFAULTS_PATH`, `BOBSHELL_DEFAULT_AUTH_TYPE`, `BOB_SHELL_MODEL`, `BOB_SHELL_SANDBOX`, `BOB_SHELL_SANDBOX_IMAGE`, `BOBSHELL_NO_RELAUNCH`, `BOBSHELL_PORT`, `BOB_SHELL_TELEMETRY_*` (`ENABLED`, `TARGET`, `OTLP_ENDPOINT`, `OTLP_PROTOCOL`, `LOG_PROMPTS`, `OUTFILE`, `USE_COLLECTOR`), `BOB_SHELL_SYSTEM_MD`, `BOB_SHELL_WRITE_SYSTEM_MD`, `BOB_SHELL_CLI_IDE_WORKSPACE_PATH`, `BOB_SHELL_CLI_IDE_SERVER_STDIO_ARGS/COMMAND`. Whether 2.0.x honours them is **unknown**.

### 2.5 Config‑home override
- **Not documented.** No page mentions a variable to relocate `~/.bob`. The 1.0.4 bundle computes the home as `path.join(os.homedir(), ".bob")` with no env override (`function i5s(){let t=ljn.homedir();return sXt.join(t,".bob")}`) — [local 1.0.4 binary]. Only the system‑settings and trusted‑folders paths have env overrides (above).

### 2.6 Telemetry
- "Bob Shell collects anonymous usage statistics … To opt out, set telemetry.enabled to false in your settings file" — configuring page. Also "/settings → Enable Usage Metrics" — https://bob.ibm.com/docs/shell/configuration/telemetry-data-shell.

### 2.7 Workspace root
- "Bob Shell determines the workspace root by walking up from the current working directory until it finds a .git directory or a .bob directory. The first match becomes the workspace root. If no .git or .bob directory is found, Bob Shell uses the current working directory" — troubleshooting page; refined in 2.0.1: "prioritizes .git over .bob when walking up".

---

## 3. Custom modes

### 3.1 File locations
Shell page — https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell (version not stated; contains 1.0‑era flags, see §3.6):
- "Global modes — Create or edit ~/.bob/custom_modes.yaml for modes available across all projects"
- "Project-specific modes — Create or edit .bob/custom_modes.yaml in your project root"
- "Bob Shell uses the same configuration format as Bob IDE, supporting both YAML (preferred) and JSON formats."
- Precedence: "Command-line arguments (--chat-mode=mode-slug); Project-level modes (.bob/custom_modes.yaml); User-level modes (~/.bob/custom_modes.yaml); System-level modes (platform-specific locations); Default modes"

IDE page — https://bob.ibm.com/docs/ide/configuration/custom-modes (version not stated; describes 2.x tool groups):
- "Global modes: Edit ~/.bob/settings/custom_modes.yaml via Settings → Modes → Edit Global Modes"
- "Project modes: Edit .bob/custom_modes.yaml in your project."
- "Global modes: Automatically migrated from legacy custom_modes.json to custom_modes.yaml on startup; Project modes: Converted to YAML when edited through the UI"

**[local 1.0.4 binary]**: global loader reads `<home>/.bob/settings/custom_modes.yaml` then `settings/custom_modes.json`, after first migrating `<home>/.bob/custom_modes.yaml` → `settings/custom_modes.yaml` ("Migrated custom modes from ${e} to ${o}"). Project loader reads `.bob/custom_modes.yaml` after migrating legacy `.bobmodes` → `.bob/custom_modes.yaml`. So in 1.0.4 the effective global path is already `~/.bob/settings/custom_modes.yaml`, and a file at `~/.bob/custom_modes.yaml` is moved there on startup (only if the settings copy does not exist).

### 3.2 YAML schema
Shell page property table: `slug` ("Used in command-line arguments: bob --chat-mode=my-mode"), `name`, `description` ("Short description shown in the mode selector"), `roleDefinition`, `groups` ("Allowed toolsets and file access"), `whenToUse`, `customInstructions`.
IDE page components: Slug, Name, Role definition, When to use ("(Optional) … used by Orchestrator for task coordination"), Available tools, Custom instructions, Description, **Allowed subagents** ("(Optional) Restricts which subagent presets the mode can use"); validation: "If you set allowedSubagents, only the listed subagent presets are available in that mode."
IDE validation rules (verbatim): "slug must use only letters, numbers, and hyphens." / "Keep each slug unique." / "Use only supported group names. Unknown group names do not grant access." / "If you omit groups, the mode does not get any grouped tools." / "Invalid fileRegex values can prevent the mode file from loading."
Example (IDE page):
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

### 3.3 Tool‑group vocabulary (contradiction — both recorded)
- IDE custom‑modes page: "read, edit (can be restricted with fileRegex), execute: Run terminal commands, mcp, skill: Load skills, workflow: Launch pre-defined workflows, todo, subtask, subagent, mode".
- Shell custom‑modes page: "read, edit (can be restricted with fileRegex), browser: Use browser automation, command: Execute terminal commands, mcp".
- Shell tools page https://bob.ibm.com/docs/shell/core-concepts/tools "Available tool groups" (with per‑mode defaults): `read, edit, execute, mcp, skill, todo, subagent, mode` (no `workflow`, `subtask`, `browser`, `command`). `--disable-tool-groups execute,mcp` examples use `execute`.
- Shell approval‑settings page permission group IDs: `read, edit, execute, mcp, skill, todo, subtask, subagent, mode`.
- Built‑in Agent mode "Available tools | Read, Edit, Execute, MCP, Skill, Todo, Subtask, Subagent, Mode" — https://bob.ibm.com/docs/shell/features/modes.
- `browser` and `command` appear **only** on the Shell custom‑modes page; the 1.0.1 IDE changelog mentions "Control and automate web browser actions". Whether 2.0.x Shell accepts `command`/`browser` is **not stated**; the IDE rule "Unknown group names do not grant access" is the risk.
- `artifact` group: **not documented anywhere**.

### 3.4 fileRegex
- IDE page: `groups: - read - - edit - fileRegex: ".*\\.(js|ts)$" description: JavaScript and TypeScript files only`. Shell page uses unquoted `fileRegex: \.(yaml|yml|sh|env)$`.

### 3.5 Built‑in modes
- 2.0.x: "By default, the following three modes are available with Bob: Agent … Plan … Ask" with role definitions, tools and "Allowed subagents | All / Explore / Explore" — https://bob.ibm.com/docs/shell/features/modes. Plan mode "Custom instructions: Must always start of every planning session, call use_skill with skill_name: "create-plan"". Overriding a default: "creating a custom mode with the same slug in your project configuration … Project-specific overrides take precedence over global overrides, which take precedence over defaults." — IDE custom‑modes page.
- 1.0.x: `--chat-mode` choices `plan, code, advanced, ask` — [local 1.0.4 binary `bob --help`]; changelog 1.0.1 lists Code/Ask/Plan/Advanced. Changelog 2.0.0: "Agent mode replaces Code and Advanced modes".
- Shell custom‑modes page "Allowing specific commands" shows a settings block `"tools": {"allowed": ["run_shell_command(git status)", …]}` and flags `--sandbox`, `-p`, `--hide-intermediary-output`, `--chat-mode=`; all of these are 1.0.4 CLI options (`bob --help` shows `-s, --sandbox`, `-p, --prompt` "[deprecated]", `--hide-intermediary-output`, `--chat-mode`) and are absent from the 2.0.x `bob run`/`bob chat` option tables (§10). Treat that page as **1.0‑era content**.

### 3.6 Mode‑specific instruction files
- Shell page: "Create mode-specific instruction files in .bob/rules-{mode-slug}/" and "Single file instructions (fallback) — Alternatively, use a single file .bobrules-{mode-slug} in your workspace root."
- IDE page: "The directory method takes precedence if both exist. Files in the directory are loaded alphabetically and combined with the customInstructions property".
- Mode slug as slash command: "a mode with slug reviewer becomes /reviewer. These mode commands cannot be overridden by custom workflow commands." — https://bob.ibm.com/docs/shell/features/slash-commands.
- Selecting: 2.0.x `bob run --mode <mode>` / `bob chat --mode <mode>` "(for example, agent, plan, ask)" and `/mode <slug>`; 1.0.x `bob --chat-mode=<slug>`.

---

## 4. Slash commands
Source: https://bob.ibm.com/docs/shell/features/slash-commands (version not stated; current). Same text on https://bob.ibm.com/docs/ide/features/slash-commands.
- Directories: "Project-specific | .bob/commands/ in your workspace root; Global | ~/.bob/commands/ in your home directory".
- "The filename becomes the command name. For example: review.md → /review, test-api.md → /test-api".
- "Custom commands must be .md files"; "The .md extension is automatically added/removed as needed".
- Frontmatter: "description | Appears in the command menu; argument-hint | Shows expected arguments". Example:
```
---
description: Create a new API endpoint
argument-hint: <endpoint-name> <http-method>
---
Create a new API endpoint called $1 that handles $2 requests.
```
- Arguments: only `$1`/`$2` positional shown. `$ARGUMENTS` is **not documented**.
- Name processing (UI‑created): "Converts to lowercase; Replaces spaces with dashes; Removes special characters; Removes leading and trailing dashes".
- Precedence: "Custom project commands override global custom commands with the same name"; mode commands "cannot be overridden by custom workflow commands".
- Subdirectories: "Group related commands in subdirectories" (no naming rule documented). [local 1.0.4 binary]: subdirectory segments are joined with `:` (`.split(sep)…join(":")`) after slugifying each segment; frontmatter schema is `{description?: string, "argument-hint"?: string}`.
- Fallback dirs (`.claude/`, `.agents/`, `.cursor/`): **not documented** and no such strings in the 1.0.4 bundle.
- "Slash commands work identically across both Bob Shell and Bob IDE".
- Built‑ins 2.0.x: /help /clear /compact(/condense,/compress,/summarize) /copy /editor /hooks /mode /permissions(/trust) /resume(/history) /settings /mcp /manage-secrets /skills /init /status(/info) /team /logs /docs /bug /exit. "/init | Initialize Bob in the current workspace".
- 1.0.x: changelog 1.0.1 "Custom modes and slash commands … Create reusable command shortcuts". 1.0.4 bundle reads `~/.bob/commands` and `.bob/commands` — [local 1.0.4 binary].

---

## 5. Skills
Source: https://bob.ibm.com/docs/shell/features/skills (2.0.0+; "Skills were not available in Bob Shell 1.0.x" — changelog).
- "Create a folder inside .bob/skills/ in your project root, or use ~/.bob/skills/ for global skills. Add a SKILL.md file inside that folder."
- Frontmatter: "Required fields: name: The skill's display name used in the Bob interface; description: A clear summary that helps Bob decide when to activate this skill—skills without descriptions are ignored". "Everything below the --- delimiter becomes the instructions".
- Extra field seen only in an IDE tutorial: `user-invocable: true` — https://bob.ibm.com/docs/ide/tutorials/use-skills (IDE; not on any Shell page; semantics not defined beyond "Allow Bob to use this skill" toggle).
- Nested resources: "You can include additional files and subfolders alongside SKILL.md … Bob can read these files automatically once the skill is activated." Example tree: `SKILL.md, checklist.md, severity-guide.md, scripts/analyze.sh, scripts/report-generator.py`.
- Precedence: "If both locations contain a skill with the same name, the project-level skill takes precedence."
- Approval: "By default, Bob asks for your permission before activating a skill … Via /settings … enable Auto-approve: Skills. Via settings.json: Add "autoApprove": { "skills": true } to your ~/.bob/settings/settings.json." (Note the separate approval page uses `approval.allowed_permissions: [... "skill" ...]`; both are on 2.0.x pages — unclear which the Shell honours, or both.)
- Invocation: "Type $ followed by a skill name to open the skill picker" — https://bob.ibm.com/docs/shell/getting-started/start-bobshell-interactive; `/skills | Insert a skill reference into the prompt`. IDE tutorial says "/skill-name" invocation and `/create-skill`.
- "Advanced mode" requirement: only in the IDE **1.0.1** changelog: "Skills automatically activate in Advanced mode when relevant to your task." Not applicable to 2.x (Advanced mode removed). No Shell page mentions it.
- Description length limit: **not documented**.
- Directory‑name validity: 2.0.3 "warns you when a skill directory name is invalid" — rules for validity **not documented**.
- Untrusted folders: "Skills | Project-bundled skills are not loaded. Only globally available skills" — trusted‑folders page.
- Tool group: `skill` (Shell tools page: default on in Agent/Plan/Ask).

---

## 6. Rules / context files
Source: https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules (version not stated; mentions "Code mode", i.e. partly 1.0‑era) and IDE https://bob.ibm.com/docs/ide/configuration/rules.
- Single files: ".bobrules - General workspace rules; .bobrules-code - Rules for Code mode; .bobrules-{modeSlug} - Rules for any mode".
- Directories: workspace `.bob/rules/`, `.bob/rules-code/` (Shell page) / `.bob/rules-agent/`, `rules-plan/`, `rules-ask/` (IDE page); global "Linux/macOS: ~/.bob/rules/ Windows: %USERPROFILE%\.bob\rules\".
- Priority: "Global rules (~/.bob/rules/); Workspace rules (.bob/rules/). Within each level, mode-specific rules load before general rules. Workspace rules can override global rules."
- File behaviour: recursive; alphabetical; excludes `.DS_Store, *.bak, *.cache, *.log, *.tmp, Thumbs.db`; symlinks depth 5; empty files skipped. Troubleshooting page: "Check that files have the correct extensions (.md, .txt, or .xml)".
- AGENTS.md: "Global context: ~/.bob/AGENTS.md (applies to all projects); Project context: AGENTS.md in project root and parent directories; Local context: AGENTS.md in subdirectories" — configuring page. Rules page: "Automatically loaded by default … Disable with "bob-shell.useAgentRules": false in settings … Loaded after mode-specific rules but before general workspace rules" (IDE page uses `"bob-code.useAgentRules"`).
- /init output (IDE tutorial https://bob.ibm.com/docs/ide/tutorials/document-repositories-with-custom-modes-practical-workflow): "AGENTS.md in the repository root; .bob/rules-code/AGENTS-code.md; .bob/rules-plan/AGENTS-plan.md; .bob/rules-ask/AGENTS-ask.md". (IDE 1.0.2 changelog: init typo fix "rules-advance" → "rules-advanced".) Shell `/init | Initialize Bob in the current workspace` — output not described.
- [local 1.0.4 binary]: reads `rules/` and `rules-{mode}/` under both `~/.bob` and `.bob`; falls back to `.bobrules`, then `.roorules`, then `.clinerules`; mode‑specific fallback order is `.roorules-{mode}` **before** `.bobrules-{mode}` then `.clinerules-{mode}`; reads `AGENTS.md` in workspace root (follows symlink).

---

## 7. MCP
### 7.1 Config files
- Shell page https://bob.ibm.com/docs/shell/configuration/mcp/mcp-bobshell: "Global configuration: Settings in <USER_HOME>/.bob/mcp_settings.json apply to all workspaces; Project-level configuration: Settings in .bob/mcp.json apply only to the current project. When a server name exists in both … the project-level configuration takes precedence." Same paths on https://bob.ibm.com/docs/shell/configuration/mcp/server-transports and …/mcp-oauth ("~/.bob/mcp_settings.json (global) or .bob/mcp.json (project)").
- IDE page https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob: "Global: Stored in ~/.bob/mcp.json … Project: Stored in .bob/mcp.json".
- [local 1.0.4 binary]: user MCP file is `<home>/.bob/settings/mcp_settings.json`, auto‑migrated from `<home>/.bob/mcp_settings.json` ("Migrated MCP settings from ${e} to ${n}"); workspace file `.bob/mcp.json`.
- So three candidate global paths exist (`~/.bob/mcp_settings.json`, `~/.bob/settings/mcp_settings.json`, `~/.bob/mcp.json`); which one 2.0.x Shell reads is **not resolvable from docs** — see §12.
### 7.2 Schema
"Each server configuration requires one of these properties: command (Stdio); url (SSE endpoint URL); httpURL (Streamable HTTP)". Optional: `args, headers, env, cwd, timeout (default: 600,000 ms), alwaysAllow ("Bob Shell reads these entries from mcp.json and applies them at the start of each task"), disabled`. IDE page additionally shows `"type": "streamable-http"` with `url`. OAuth keys (IDE mcp‑oauth page): `oauth`, `clientId`, `clientSecret`, `scope`. Secrets: `${KEY}` from `/manage-secrets`.
### 7.3 CLI
- Documented only in changelog 2.0.0: "bob mcp add, bob mcp add-json, bob mcp remove, and bob mcp list. Supports both global and workspace scopes, and stdio, SSE, and HTTP transports." The "Learn more" link goes to the mcp‑bobshell page, which **does not document the syntax**.
- [local 1.0.4 binary] `bob mcp --help`: `bob mcp add <name> <commandOrUrl> [args...]`, `bob mcp remove <name>`, `bob mcp list`; `bob mcp add` options: `-s, --scope` (`user|project`, **default: project**), `-t, --transport` (`stdio|sse|http`, default stdio), `-e, --env KEY=value`, `-H, --header`, `--timeout <ms>`, `--description`, `--include-tools`, `--exclude-tools`, `--trust`. (1.0.4 has no `add-json`.)
- 2.0.x: `--disable-mcp`; `/mcp`; MCP OAuth interactive only (2.0.3).

---

## 8. Subagents and agent personas
Source: https://bob.ibm.com/docs/shell/features/subagents (2.0.x).
- "A subagent is an independent agent that Bob can spawn … It runs in its own isolated context window".
- "You are prompted to approve the spawn before it starts."
- Types: "explore | Read-only codebase exploration, runs on a lighter model; general | Full tool access, runs on the default model".
- "Bob can set fork_context: true to pass the conversation history into the subagent."
- Mode gating: "Allowed subagents | All (Agent) / Explore (Plan) / Explore (Ask)"; custom modes: `allowedSubagents` (IDE page).
- Parallelism: Shell docs do not state concurrency. IDE page https://bob.ibm.com/docs/ide/features/subagents: "When multiple subagents run at the same time — for example, during a workflow that spawns several specialized agents in parallel — they are grouped into a single collapsible panel" and IDE 2.0.0 changelog: "Bob can now break complex tasks into parallel workstreams by spawning specialized subagents". **For Shell specifically, parallel fan‑out is not documented.**
- Flags/settings: `--disable-subagents` (bob run, bob acp); `session.subagents` setting.
- Tool name: `spawn_subagent` — **not on any Shell page** (the Shell tools page lists read_file, search_files, list_files, list_code_definition_names, write_to_file, apply_diff, insert_content, execute_command, use_mcp_tool, switch_mode, ask_followup_question only).
- Persona files: trusted‑folders page says "Subagents | Custom subagents from the project folder are unavailable. The agent cannot delegate work to project-provided helpers." and IDE 2.0.2 changelog says untrusted folders suspend "workspace-sourced configuration, skills, agents, rules, and MCP servers". **No page documents a `.bob/agents/` directory, a persona file format, or its frontmatter.** [local 1.0.4 binary]: no `.bob/agents` string; only an internal "experimental subagents" settings toggle.

---

## 9. Lifecycle hooks
Source: https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks (2.0.2+; PreCompact/PostCompact and `https` type 2.0.3+).
- Location: "Hooks are defined under the hooks key in your settings.json … Global (all workspaces) | ~/.bob/settings/settings.json; Workspace (current project) | .bob/settings.json". "Workspace hooks only run in trusted folders."
- Events: SessionStart, UserPromptSubmit (blocking), PreToolUse (blocking), PostToolUse, PreCompact (blocking), PostCompact, Stop.
- Schema: `{"hooks":{"PreToolUse":[{"matcher":"^write_file$","hooks":[{"type":"command","command":"sh .bob/hooks/check.sh","timeout":5}]}]}}`; fields `type ("command"|"https")`, `command`, `url`, `matcher` (regex on tool name; PreToolUse/PostToolUse only), `timeout` (default 10 s).
- Payload (stdin JSON): `{"event","session_id"}` plus `prompt` (UserPromptSubmit), `tool`,`input` (PreToolUse), `tool`,`input`,`output` (PostToolUse). Exit 2 blocks; stdout of SessionStart/UserPromptSubmit is injected as context.
- Enforcement: `EnforcedHooks` policy — https://bob.ibm.com/docs/ide/security/group-policies ("Enterprise policies are currently supported by Bob IDE only" — yet Shell 2.0.2 changelog says the same policy applies; **contradiction**, §12).
- 1.0.x: no lifecycle hooks (1.0.4 bundle has no `PreToolUse`; only internal Gemini‑style event enum) — [local 1.0.4 binary].

---

## 10. Non‑interactive / headless
Source: https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive (2.0.x).
- `bob run [options] [prompt...]`; stdin piping; `--format pretty|json|stream-json`; `--mode`, `--max-cost`, `--max-turns`, `--disable-mcp`, `--disable-subagents`, `--disable-tool-groups <groups>`, `--workspace <path>`, `--log-level`, `--resume <task-id>|latest`, `--team-id`, `--trust`, `--accept-license`. Utility: `bob --list-tasks [n|all]`, `--limit`, `--show-license`, `bob --version`.
- "When running non-interactively with bob run, all tools are pre-approved."
- JSON schema: `type:"result"`, `timestamp`, `status`, `stats{task_id,total_tokens,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,cache_ratio,duration_ms,session_costs,tool_calls}`, `last_message`. stream‑json events: `message, tool_use, tool_result, error, result`.
- Auth: API key via `BOB_API_KEY`; "If your API key is of type general … you must also pass --team-id" — install page. The gsd project's assumed `--auth-method api-key` flag is **not documented on any page**; auth method selection is by env var.
- 1.0.x: `bob -p "<prompt>"` ("[deprecated: Use the positional prompt instead]"), `bob "<query>"`, `-o, --output-format text|json|stream-json`, `-y, --yolo`, `--approval-mode default|auto_edit|yolo`, `--allowed-tools`, `--list-sessions`, `--max-coins` — [local 1.0.4 binary]. Changelog 2.0.1 restored `--list-sessions`/`--limit` as aliases.
- Trusted folders in headless: "non-interactive sessions (bob run) never display the trust dialog"; feature "disabled by default"; when enabled an unresolved folder "is treated as trusted"; DONT_TRUST → error "<folder> is not a trusted folder. Pass --trust …" — https://bob.ibm.com/docs/shell/security/trusted-folders. In untrusted folders: ".bob/settings.json is not loaded", "Modes defined in the project folder are unavailable", "Project-bundled skills are not loaded", "AGENTS.md and custom project rules are not read", MCP servers not connected.
- ACP (2.0.2+): `bob acp` for Zed/IntelliJ/Neovim; `--trust`, `--auto-approve`, `--disable-mcp`, `--disable-subagents`, `--accept-license` — https://bob.ibm.com/docs/shell/features/acp.

---

## 11. "What changed in 2.0" and anything newer than 2.0.1
- 2.0.0: settings moved to `~/.bob/settings/settings.json`; Agent mode replaces Code+Advanced; Skills added; `bob mcp` subcommands; `bob run` JSON `stats`; message queue; fresh install required from 1.0.x (§1).
- 2.0.1: `alwaysAllow` in `.bob/mcp.json` honoured in Shell; settings‑file writes always need approval; `~/.bob/` writes never auto‑approved; `.git` preferred over `.bob` for workspace root; retention 30 days; `--list-sessions` alias.
- 2.0.2: `bob acp`; `/hooks`; `EnforcedHooks`; z/OS; global skill dirs excluded from workspace scope; office tools.
- 2.0.3: PreCompact/PostCompact; `https` hook handlers; interactive MCP OAuth; invalid‑skill‑dir warnings; `/compact` unified; `--disable-mcp` fix.
- 2.0.4: listed as "Latest" on https://bob.ibm.com/releases?bob=shell; **no changelog entry exists** (unknown contents).

---

## 12. Contradictions (both sides recorded)
1. **Global custom‑modes path.** Shell page https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell: "Create or edit ~/.bob/custom_modes.yaml". IDE page https://bob.ibm.com/docs/ide/configuration/custom-modes: "Edit ~/.bob/settings/custom_modes.yaml". The 1.0.4 binary reads `~/.bob/settings/custom_modes.yaml` and migrates the root file into it [local 1.0.4 binary]; 2.0.x behaviour not stated in docs.
2. **Tool group for terminal commands.** Shell custom‑modes page: "command: Execute terminal commands" and "browser". IDE custom‑modes page, Shell tools page, Shell approval page, Shell modes page: `execute` (and no `browser`/`command`).
3. **Global MCP file.** Shell MCP pages: `~/.bob/mcp_settings.json`. IDE MCP page: `~/.bob/mcp.json`. 1.0.4 binary: `~/.bob/settings/mcp_settings.json` (migrated from `~/.bob/mcp_settings.json`).
4. **User settings path.** Troubleshooting page: `~/.bob/settings.json`. Configuring/hooks/approval/trusted‑folders pages and 2.0.0 changelog: `~/.bob/settings/settings.json`.
5. **API‑key env var.** Install page: `BOB_API_KEY`. ACP page: `BOBSHELL_API_KEY`.
6. **Skills auto‑approve key.** Skills page: `"autoApprove": {"skills": true}`. Approval‑settings/auto‑approve pages: `"approval": {"allowed_permissions": ["skill", …]}`.
7. **Enterprise policies scope.** IDE group‑policies page: "Enterprise policies are currently supported by Bob IDE only." Shell changelog 2.0.2: "Administrators can now use the EnforcedHooks policy" and the Shell hooks page links "To enforce hooks across all users in your organization, see EnforcedHooks."
8. **AGENTS.md disable key.** Shell rules page: `"bob-shell.useAgentRules": false`. IDE rules page: `"bob-code.useAgentRules": false`.
9. **Mode‑selection flag.** Shell custom‑modes page: `bob --chat-mode=<slug>` (1.0.4 syntax). Non‑interactive/interactive pages: `bob run --mode <mode>` / `bob chat --mode <mode>`.
10. **Rules loaded in untrusted folders.** Security‑guidance page lists "Custom commands are not loaded" for safe mode; trusted‑folders page's table does not mention commands but lists settings, auto‑approval, MCP, modes, skills, subagents, project instructions.

---

## 13. Not documented (looked for, not found)
- Any Bob Shell **2.0.4** changelog or release notes.
- A config‑home override (`BOB_HOME`, `BOB_CONFIG_DIR`, XDG) for `~/.bob`.
- The exact global custom‑modes path that **2.0.x Shell** reads (§12.1).
- The exact global MCP file that **2.0.x Shell** reads (§12.3).
- `bob mcp add` / `add-json` syntax and flags in any docs page (only the changelog sentence).
- `$ARGUMENTS` or any argument variable other than `$1`/`$2`; the naming rule for commands in subdirectories.
- Slash‑command frontmatter beyond `description` and `argument-hint`; SKILL.md frontmatter beyond `name`/`description` (IDE tutorial shows `user-invocable` without defining it).
- A maximum length for skill/command descriptions; skill directory‑name validity rules.
- `.claude/`, `.agents/`, `.cursor/` or any non‑`.bob` fallback directories for commands or skills.
- `.bob/agents/`, agent persona files, their frontmatter, or any user‑authored subagent definition format; the `spawn_subagent` tool name on Shell pages.
- Whether Shell runs subagents concurrently (parallel fan‑out); only the IDE page describes parallel subagents.
- `artifact` tool group; whether `command`/`browser` groups are accepted by 2.0.x.
- Whether a skill can invoke a slash command or another skill.
- `--auth-method api-key` flag (auth is env‑var driven).
- Whether `BOB_API_KEY` and `BOBSHELL_API_KEY` are both honoured in 2.0.x.
- Whether the 1.0.4‑only env vars (`BOB_SHELL_CLI_SYSTEM_SETTINGS_PATH`, `BOB_SHELL_CLI_TRUSTED_FOLDERS_PATH`, `BOBSHELL_DEFAULT_AUTH_TYPE`, …) survive in 2.0.x.
- Release dates per version beyond the changelog's month granularity; `lastmod` on docs pages.
- The `.bob/settings.json` project schema (only the `hooks` key is shown for it).
- The on‑disk format of `~/.bob/settings/auth-secrets.json` and the encrypted secrets store.
- Any 1.0.x‑specific documentation archive (docs are unversioned).

---

## Appendix A — pages read (all fetched 2026-09-16)
Shell: /docs/shell, /docs/shell/changelog, /docs/shell/faq, /docs/shell/getting-started/{install-and-setup, uninstalling-bobshell, start-bobshell-interactive, start-bobshell-non-interactive, best-practices, bobshell-examples}, /docs/shell/core-concepts/{tools, context-window-management, context-poisoning, large-projects}, /docs/shell/configuration/{configuring, custom-modes-bobshell, bobshell-custom-rules, approval-settings, ignoring-files, keyboard-shortcuts, lifecycle-hooks, telemetry-data-shell, mcp/mcp-bobshell, mcp/mcp-oauth, mcp/server-transports, mcp/understanding-mcp}, /docs/shell/features/{slash-commands, skills, subagents, modes, auto-approving-actions, acp, instance-command, background-processes}, /docs/shell/account/{api-keys, bobcoins}, /docs/shell/security/{trusted-folders, bob-security-guidance, data-residency}, /docs/shell/troubleshooting/{troubleshoot, ts-proxy}.
IDE (for cross‑checks): /docs/ide/changelog, /docs/ide/configuration/{custom-modes, rules, lifecycle-hooks, telemetry-data, mcp/*}, /docs/ide/features/{skills, slash-commands, subagents, modes, auto-approving-actions}, /docs/ide/core-concepts/tools, /docs/ide/getting-started/{install, migrating}, /docs/ide/security/group-policies, /docs/ide/tutorials/{use-skills, add-bob-capabilities, standardize-bobs-behavior, document-repositories-with-custom-modes-practical-workflow}, /docs/ide/premium-packages/bob-for-i/{workflows, skills, slash-commands, modes}.
Other: https://bob.ibm.com/releases?bob=shell, https://bob.ibm.com/download, https://bob.ibm.com/blog/august-2026-release/, https://www.ibm.com/docs/en/bobz/3.0.0?topic=z-installing-using-bob-shell, third‑party https://github.com/dyoshikawa/rulesync/issues/3011 and /issues/3074 (used only to confirm no newer versions are cited).
Local (non‑doc) evidence: `/opt/homebrew/lib/node_modules/bobshell` (`bobshell@1.0.4`, engines node >=20.0.0), `bob --help`, `bob mcp --help`, `bob mcp add --help`, `ls ~/.bob`.
