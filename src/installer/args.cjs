'use strict';

/**
 * args.cjs — hand-parsed CLI flag contract for the gsd-bob installer.
 *
 * Mirrors gsd-core's `selectRuntimesFromArgs()` convention exactly: NO third-
 * party CLI-parsing framework, node builtins only, every unrecognized token
 * rejected with a concrete error. There is deliberately NO `--clean` or
 * `--update` flag — re-running install IS the update; `--uninstall` + install
 * IS the clean. Recognizing those flags would diverge from gsd-core and break
 * UX parity (the project instruction file §"What NOT to Use").
 *
 * Recognized flags:
 *   --bob                 runtime selector (accepted for UX parity, no effect here)
 *   --local | -l          scope = 'local'  (→ <cwd>/.bob)
 *   --global | -g         scope = 'global' (→ getGlobalConfigDir('bob', …))
 *   --config-dir | -c X   explicitDir = X  (consumes the next token)
 *   --uninstall | -u      uninstall = true
 *   --dry-run             dryRun = true
 *   --help | -h           help = true
 *
 * Default scope is `null` when no scope flag is present — the entry point uses
 * null to trigger the interactive readline prompt.
 *
 * @param {string[]} argv - argument tokens (already sliced of node/script).
 * @returns {{scope: ('local'|'global'|null), explicitDir: (string|undefined),
 *            dryRun: boolean, uninstall: boolean, help: boolean}}
 */
function parseArgs(argv) {
  const opts = {
    scope: null,
    explicitDir: undefined,
    dryRun: false,
    uninstall: false,
    help: false,
  };

  const args = Array.isArray(argv) ? argv : [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    switch (token) {
      case '--bob':
        // Runtime selector — accepted for UX parity with gsd-core, no effect.
        break;
      case '--local':
      case '-l':
        opts.scope = 'local';
        break;
      case '--global':
      case '-g':
        opts.scope = 'global';
        break;
      case '--config-dir':
      case '-c': {
        const next = args[i + 1];
        if (next === undefined || next.startsWith('-')) {
          throw new Error(`Flag "${token}" requires a directory path argument`);
        }
        opts.explicitDir = next;
        i += 1; // consume the value token
        break;
      }
      case '--uninstall':
      case '-u':
        opts.uninstall = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(
          `Unknown flag "${token}". (Note: --clean/--update do not exist — ` +
            're-run install to update; --uninstall then install to clean.)',
        );
    }
  }

  return opts;
}

module.exports = { parseArgs };
