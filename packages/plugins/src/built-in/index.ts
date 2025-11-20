import { pluginManager } from '../manager';
import { createPQCScannerPlugin } from './pqc-scanner';
import { createQCMMPlugin } from './q-cmm';

/**
 * Register all built-in plugins
 */
export function registerBuiltInPlugins(): void {
  // Register PQC Scanner
  const pqcScanner = createPQCScannerPlugin();
  pluginManager.registerPlugin(pqcScanner.manifest, createPQCScannerPlugin, true);

  // Register Q-CMM Assessment
  const qcmm = createQCMMPlugin();
  pluginManager.registerPlugin(qcmm.manifest, createQCMMPlugin, true);

  console.log('✅ Registered 2 built-in plugins');
}

export { createPQCScannerPlugin, createQCMMPlugin };
