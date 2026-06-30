import {
  apply,
  chain,
  filter,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';

function buildDefaultPath(host: Tree, projectName: string): string {
  const workspace = host.read('angular.json');
  if (!workspace) return '/src/app';
  const config = JSON.parse(workspace.toString());
  const project = config.projects[projectName || config.defaultProject];
  return project?.sourceRoot ?? 'src';
}

export function init(options: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    const appName = options.appName || 'Mi Aplicación';
    const project = options.project || '';
    const sourceRoot = buildDefaultPath(host, project);
    const appRoot = `${sourceRoot}/app`;
    const minimal = options.minimal === true;

    context.logger.info(`Initializing @avacosistemas/core in ${appRoot}...`);

    const templateData = {
      ...strings,
      appName,
      appRoot,
      minimal,
      APPLICATION_IMPORTS: '',
      ENVIRONMENT_IMPORTS: '',
    };

    const rootFiles = ['tailwind.config.js.template', 'web.config.template'];

    const mainSource = apply(url('./files'), [
      filter(p => !rootFiles.some(f => p.endsWith(f))),
      template(templateData),
      move(sourceRoot),
    ]);

    const rootSource = apply(url('./files'), [
      filter(p => rootFiles.some(f => p.endsWith(f))),
      template(templateData),
      move('/'),
    ]);

    return chain([
      mergeWith(mainSource),
      mergeWith(rootSource),
      (t: Tree) => updateAngularJson(t, sourceRoot),
      (t: Tree) => updateTsConfig(t),
      (t: Tree) => updateIndexHtml(t, sourceRoot, appName),
      (t: Tree) => updatePackageJson(t),
      (t: Tree) => removeTemplateMarkers(t, sourceRoot),
    ]);
  };
}

function updateAngularJson(host: Tree, sourceRoot: string): Tree {
  const path = 'angular.json';
  const buf = host.read(path);
  if (!buf) return host;

  const config = JSON.parse(buf.toString());
  const projectName = Object.keys(config.projects)[0];
  const project = config.projects[projectName];
  if (!project) return host;

  const buildOpts = project.architect?.build?.options;
  if (!buildOpts) return host;

  buildOpts.preserveSymlinks = true;

  // Keep only the default styles.scss, remove framework stylesheet references since they are loaded via @import in src/styles.scss
  const styles = buildOpts.styles || [];
  const staleStyles = [
    'node_modules/@avacosistemas/core/assets/styles/tailwind.scss',
    'node_modules/@avacosistemas/core/assets/styles/main.scss',
    'node_modules/@avacosistemas/core/assets/styles/styles.scss',
    'node_modules/@avacosistemas/core/assets/styles/themes.scss',
  ];
  for (const ss of staleStyles) {
    const idx = styles.indexOf(ss);
    if (idx !== -1) styles.splice(idx, 1);
  }
  const defaultStyle = `${sourceRoot}/styles.scss`;
  if (!styles.includes(defaultStyle) && !styles.includes('src/styles.scss')) {
    styles.push(defaultStyle);
  }
  buildOpts.styles = styles;

  // Add style preprocessor include path
  const includePaths = buildOpts.stylePreprocessorOptions?.includePaths || [];
  const fwkSassPaths = [
    'node_modules/@avacosistemas/core/assets/styles',
    'node_modules/@avacosistemas/core',
  ];
  for (const p of fwkSassPaths) {
    if (!includePaths.includes(p)) {
      includePaths.push(p);
    }
  }
  buildOpts.stylePreprocessorOptions = { includePaths };

  // Add asset configuration for @avacosistemas/core assets folder (copied directly to assets/)
  const assets = buildOpts.assets || [];
  
  // Clean up any stale segmented asset references
  const staleAssetsInputPrefixes = [
    'node_modules/@avacosistemas/core/assets/icons',
    'node_modules/@avacosistemas/core/assets/fonts',
    'node_modules/@avacosistemas/core/assets/tinymce',
    'node_modules/@avacosistemas/core/assets/styles',
  ];
  const filteredAssets = assets.filter((a: any) => {
    if (typeof a === 'object' && a.input) {
      return !staleAssetsInputPrefixes.some(prefix => a.input.startsWith(prefix));
    }
    return true;
  });

  const fwkAsset = { glob: '**/*', input: 'node_modules/@avacosistemas/core/assets', output: 'assets', followSymlinks: true };
  const exists = filteredAssets.some((a: any) =>
    typeof a === 'object' && a.input === fwkAsset.input
  );
  if (!exists) {
    filteredAssets.push(fwkAsset);
  }

  const tinymceAsset = { glob: '**/*', input: 'node_modules/tinymce', output: 'tinymce' };
  const tinymceExists = filteredAssets.some((a: any) =>
    typeof a === 'object' && a.input === tinymceAsset.input
  );
  if (!tinymceExists) {
    filteredAssets.push(tinymceAsset);
  }

  buildOpts.assets = filteredAssets;

  host.overwrite(path, JSON.stringify(config, null, 2));
  return host;
}

function getIndexPath(host: Tree): string {
  const buf = host.read('angular.json');
  if (!buf) return 'src/index.html';
  const config = JSON.parse(buf.toString());
  const projectName = Object.keys(config.projects)[0];
  const buildOpts = config.projects[projectName]?.architect?.build?.options;
  if (!buildOpts?.index) return 'src/index.html';
  if (typeof buildOpts.index === 'string') return buildOpts.index;
  return buildOpts.index.input ?? 'src/index.html';
}

function updateIndexHtml(host: Tree, sourceRoot: string, appName: string): Tree {
  const indexPath = getIndexPath(host);

  const description = `Administrador de ${appName}`;

  const html = `<!DOCTYPE html>
<html lang="en">

<head>
    <title>${appName}</title>
    <meta charset="utf-8">
    <meta name="description" content="${description}">
    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, minimum-scale=1.0">
    <base href="/">
    <link rel="icon" type="image/png" href="assets/images/logo/logo.svg">
    <link href="assets/fonts/inter/inter.css" rel="stylesheet">
    <link href="https://fonts.gstatic.com" rel="preconnect">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&amp;display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="assets/styles/splash-screen.css" rel="stylesheet">
    <link href="assets/styles/style.css" rel="stylesheet">
</head>

<body>
   <fwk-splash-screen>
        <img src="assets/images/logo/logo.svg" alt="Logo" loading="lazy" onerror="this.style.display='none'">
        <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
        </div>
    </fwk-splash-screen>
    <app-root></app-root>
</body>

</html>`;

  if (host.exists(indexPath)) {
    host.overwrite(indexPath, html);
  } else {
    host.create(indexPath, html);
  }

  return host;
}

function parseJsonWithComments(text: string): any {
  const { parse } = require('jsonc-parser');
  return parse(text);
}

function updateTsConfig(host: Tree): Tree {
  const path = 'tsconfig.json';
  const buf = host.read(path);
  if (!buf) return host;

  const config = parseJsonWithComments(buf.toString());
  if (!config.compilerOptions) config.compilerOptions = {};
  if (!config.compilerOptions.paths) config.compilerOptions.paths = {};

  config.compilerOptions.baseUrl = config.compilerOptions.baseUrl || '.';

  const paths = config.compilerOptions.paths;
  const requiredPaths: Record<string, string[]> = {
    '@fwk': ['node_modules/@avacosistemas/core'],
    '@avacosistemas/core': ['node_modules/@avacosistemas/core'],
    '@fwk/*': ['node_modules/@avacosistemas/core/*'],
    'environments/*': ['src/environments/*'],
    'app/*': ['src/app/*'],
  };

  for (const [alias, resolution] of Object.entries(requiredPaths)) {
    paths[alias] = resolution;
  }

  host.overwrite(path, JSON.stringify(config, null, 2));
  return host;
}

function updatePackageJson(host: Tree): Tree {
  const path = 'package.json';
  const buf = host.read(path);
  if (!buf) return host;

  const pkg = JSON.parse(buf.toString());

  // Merge scripts
  if (!pkg.scripts) pkg.scripts = {};
  const scriptsToAdd = {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "generate:registries": "node node_modules/@avacosistemas/core/_scripts/generate-registries.js"
  };
  pkg.scripts = { ...pkg.scripts, ...scriptsToAdd };

  // Add required dependencies
  if (!pkg.dependencies) pkg.dependencies = {};
  const depsToAdd = {
    "date-fns": "^2.30.0",
    "lodash-es": "^4.17.21",
    "luxon": "^3.4.0",
    "perfect-scrollbar": "^1.5.5"
  };
  pkg.dependencies = { ...depsToAdd, ...pkg.dependencies };

  // Add required devDependencies
  if (!pkg.devDependencies) pkg.devDependencies = {};
  const devDepsToAdd = {
    "@angular/material": "^17.0.3",
    "@angular/cdk": "^17.0.3",
    "@angular/material-date-fns-adapter": "^17.0.3",
    "@tailwindcss/typography": "0.5.10",
    "@tinymce/tinymce-angular": "^7.0.0",
    "apexcharts": "3.44.0",
    "autoprefixer": "10.4.16",
    "ng-apexcharts": "1.8.0",
    "ngx-color-picker": "16.0.0",
    "postcss": "8.4.31",
    "tailwindcss": "3.3.5"
  };
  pkg.devDependencies = { ...devDepsToAdd, ...pkg.devDependencies };

  host.overwrite(path, JSON.stringify(pkg, null, 2));
  return host;
}

function removeTemplateMarkers(host: Tree, sourceRoot: string): Tree {
  // Remove .template extension from generated files
  const dir = host.getDir('/');
  dir.visit((filePath) => {
    if (filePath.endsWith('.template')) {
      const newPath = filePath.replace('.template', '');
      if (host.exists(newPath)) {
        host.delete(newPath);
      }
      host.rename(filePath, newPath);
    }
  });
  return host;
}

