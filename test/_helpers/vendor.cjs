'use strict';

/**
 * Vendor resolver — single source of truth for the absolute path to the
 * VENDORED gsd-core lib directory (`./gsd-core/bin/lib`).
 *
 * Every test requires the extended registry/descriptor modules through this
 * helper so they exercise the project's vendored copy (which carries the `bob`
 * runtime entry), never a global install under the upstream dot-home.
 *
 *   const { vendorLib, requireVendor } = require('../_helpers/vendor.cjs');
 *   const { resolveConfigHomeFromDescriptor } = requireVendor('runtime-homes.cjs');
 */

const path = require('node:path');

// Repo root is two levels up from test/_helpers/.
const repoRoot = path.resolve(__dirname, '..', '..');
const vendorLib = path.join(repoRoot, 'gsd-core', 'bin', 'lib');
const vendorShared = path.join(repoRoot, 'gsd-core', 'bin', 'shared');

/** Require a module from the vendored gsd-core lib by filename. */
function requireVendor(file) {
  // eslint-disable-next-line global-require
  return require(path.join(vendorLib, file));
}

module.exports = { repoRoot, vendorLib, vendorShared, requireVendor };
