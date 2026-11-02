#!/usr/bin/env node

/**
 * Scaffolds one feature folder following docs/FEATURE_MODULE_STANDARD.md.
 *
 * Usage:
 *   node tools/scaffold-feature.js <feature> [--domain=<domain>] [--root=<path>]
 *                                  [--force] [--dry-run]
 *
 * The script never edits src/server/main.ts; it prints the two lines to add.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (raw === '--force') args.force = true;
    else if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--domain=')) args.domain = raw.slice('--domain='.length);
    else if (raw.startsWith('--root=')) args.root = raw.slice('--root='.length);
    else if (raw.startsWith('--')) throw new Error(`Unknown option: ${raw}`);
    else args._.push(raw);
  }
  return args;
}

function pascalCase(value) {
  return value.split('-').filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join('');
}

function titleCase(value) {
  return value.split('-').filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const feature = args._[0];
  if (!feature) throw new Error('Usage: node tools/scaffold-feature.js <feature> [--domain=<domain>]');
  if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
    throw new Error('Feature name must be kebab-case: lowercase letters, digits and dashes.');
  }
  const domain = args.domain || 'misc';
  if (!/^[a-z][a-z0-9-]*$/.test(domain)) {
    throw new Error('Domain must be kebab-case: lowercase letters, digits and dashes.');
  }

  const root = args.root ? path.resolve(args.root) : ROOT;
  const pascal = pascalCase(feature);
  const title = titleCase(feature);
  const dir = path.join(root, 'src', 'modules', domain, feature);
  const testFile = path.join(root, 'tests', `verify-${feature}.ts`);

  const files = {
    [path.join(dir, `${feature}.module.ts`)]: [
      "import { IFeatureModule, ModuleContext } from '../../../core/types';",
      "import { Router } from '../../../server/router';",
      `import { register${pascal}Routes } from './${feature}.controller';`,
      '',
      `export class ${pascal}Module implements IFeatureModule {`,
      `  public readonly id = '${feature}';`,
      `  public readonly name = '${title}';`,
      `  public readonly version = '0.1.0';`,
      '',
      '  public init(_ctx: ModuleContext): void {}',
      '',
      '  public registerRoutes(router: Router): void {',
      `    register${pascal}Routes(router);`,
      '  }',
      '}',
      ''
    ].join('\n'),
    [path.join(dir, `${feature}.service.ts`)]: [
      "import { DatabaseService } from '../../../core/database';",
      '',
      `export class ${pascal}Service {`,
      '  public constructor(private readonly db: DatabaseService) {}',
      '',
      `  public static forDatabase(db: DatabaseService): ${pascal}Service {`,
      `    return new ${pascal}Service(db);`,
      '  }',
      '}',
      ''
    ].join('\n'),
    [path.join(dir, `${feature}.controller.ts`)]: [
      "import { Router, sendJson } from '../../../server/router';",
      "import { DatabaseService } from '../../../core/database';",
      `import { ${pascal}Service } from './${feature}.service';`,
      '',
      `export function register${pascal}Routes(router: Router): void {`,
      '  const db = DatabaseService.getInstance();',
      `  const service = ${pascal}Service.forDatabase(db);`,
      `  router.get('/api/${domain}/${feature}/ping', (_req, res) => {`,
      `    sendJson(res, 200, { success: true, feature: '${feature}', ready: Boolean(service) });`,
      '  });',
      '}',
      ''
    ].join('\n'),
    [path.join(dir, `${feature}.types.ts`)]: [
      `export interface ${pascal}Summary {`,
      '  id: string;',
      '  ready: boolean;',
      '}',
      ''
    ].join('\n'),
    [path.join(dir, 'index.ts')]: [
      `export { ${pascal}Module } from './${feature}.module';`,
      `export { ${pascal}Service } from './${feature}.service';`,
      `export type * from './${feature}.types';`,
      ''
    ].join('\n'),
    [testFile]: [
      "import assert from 'assert';",
      `import { ${pascal}Module } from '../src/modules/${domain}/${feature}';`,
      '',
      `const module = new ${pascal}Module();`,
      `assert.strictEqual(module.id, '${feature}');`,
      `console.log('PASSED: ${feature} module scaffold');`,
      ''
    ].join('\n')
  };

  for (const file of Object.keys(files)) {
    if (fs.existsSync(file) && !args.force) {
      throw new Error(`Refusing to overwrite ${path.relative(root, file)} (use --force).`);
    }
  }

  for (const [file, content] of Object.entries(files)) {
    const relative = path.relative(root, file);
    if (args.dryRun) {
      console.log(`[dry-run] ${relative}`);
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
    console.log(`created ${relative}`);
  }

  console.log('');
  console.log('Next steps:');
  console.log(`1. Register in src/server/main.ts:`);
  console.log(`   import { ${pascal}Module } from '../modules/${domain}/${feature}';`);
  console.log(`   registry.register(new ${pascal}Module());`);
  console.log(`2. Call register${pascal}Routes(router) in createGrandStrategyRouter(), or`);
  console.log('   call module.registerRoutes(router) if the module registry is initialized.');
  console.log('3. Replace the generated smoke test with a behavioural suite.');
  console.log('4. Add a migration if the feature owns schema.');
  console.log('5. Run npm run verify.');
}

try {
  main();
} catch (error) {
  console.error(`[scaffold] ${error.message}`);
  process.exit(1);
}
