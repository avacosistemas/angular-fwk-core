const { globSync } = require('glob');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando generador de registros CRUD...');

const ignoredDirs = [''];

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

const projectRoot = process.cwd();
const resourcesPath = path.join(projectRoot, 'src', 'app', 'resources');
const registryFilePath = path.join(projectRoot, 'src', 'app', 'core', 'registries', 'crud.registry.ts');

let existingPaths = new Set();
try {
    if (fs.existsSync(registryFilePath)) {
        const oldContent = fs.readFileSync(registryFilePath, 'utf8');
        const pathRegex = /path: '([^']+)'/g;
        let match;
        while ((match = pathRegex.exec(oldContent)) !== null) {
            existingPaths.add(match[1]);
        }
    }
} catch (e) {
    console.warn('⚠️ No se pudo leer el archivo de registro existente para comparar cambios.');
}

const defFiles = globSync(path.join(resourcesPath, '**', '*.def.ts').replace(/\\/g, '/'))
    .filter(file => {
        const dirName = path.basename(path.dirname(file));
        return !ignoredDirs.includes(dirName);
    });

const crudModules = [];
const allCrudDefsForNav = [];

defFiles.forEach(file => {
    const fileContent = fs.readFileSync(file, 'utf8');
    const constNameMatch = fileContent.match(/export const (\w+_DEF): (CrudDef|PageComponentDef)/);
    if (!constNameMatch) {
        console.warn(`⚠️  No se encontró una constante _DEF en: ${file}`);
        return;
    }
    const constName = constNameMatch[1];
    
    let routePath = '';

    const navConstMatch = fileContent.match(/navigation: (\w+_NAV_DEF)/);
    if (navConstMatch) {
        const navConstName = navConstMatch[1];
        const navImportMatch = fileContent.match(new RegExp(`import { ${navConstName} } from '([^']+)';`));
        if (navImportMatch) {
            const navImportPath = navImportMatch[1];
            const navFilePath = path.resolve(path.dirname(file), `${navImportPath}.ts`);
            try {
                const navFileContent = fs.readFileSync(navFilePath, 'utf8');
                const urlMatch = navFileContent.match(/url: '([^']*)'/);
                if (urlMatch && urlMatch[1]) {
                    routePath = urlMatch[1].replace(/^\//, '');
                }
            } catch (e) {
                console.warn(`- No se pudo leer el archivo de navegación para ${constName}.`);
            }
        }
    }

    if (!routePath) {
        const folderName = path.basename(path.dirname(file));
        routePath = snakeToCamel(folderName);
        console.warn(`- No se encontró URL en NAV_DEF para ${constName}. Usando fallback: '${routePath}'`);
    }

    const importPath = path.relative(path.join(projectRoot, 'src'), file).replace(/\\/g, '/').replace(/\.ts$/, '');
    
    crudModules.push({
        path: routePath,
        importPath: importPath
    });

    allCrudDefsForNav.push(importPath);
});

crudModules.sort((a, b) => a.path.localeCompare(b.path));
allCrudDefsForNav.sort();

const crudRegistryContent = `import { CrudModuleDefinition, CrudDef } from '@fwk/core';

export const CRUD_MODULES: CrudModuleDefinition[] = [
${crudModules.map(m => `    {
        path: '${m.path}',
        loader: () => import('${m.importPath}')
    }`).join(',\n')},
];

export function loadAllCrudDefs(): Promise<any[]> {
  return Promise.all(CRUD_MODULES.map(m => m.loader().then((mod: any) => {
    const key = Object.keys(mod).find(k => k.endsWith('_DEF'));
    return key ? mod[key] : null;
  })));
}

export async function loadCrudDefByPath(path: string): Promise<CrudDef | null> {
    const moduleDefinition = CRUD_MODULES.find(m => m.path === path);
    if (!moduleDefinition) {
        return null;
    }
    const loadedModule = await moduleDefinition.loader();
    const defKey = Object.keys(loadedModule).find(key => key.endsWith('_DEF'));
    return defKey ? (loadedModule as any)[defKey] : null;
}
`;

try {
    fs.writeFileSync(registryFilePath, crudRegistryContent);
    console.log(`\n✅ Archivo de registro actualizado exitosamente en: ${registryFilePath}`);
    console.log(`   Se encontraron y registraron ${crudModules.length} CRUDs.`);

    const newPaths = new Set(crudModules.map(m => m.path));
    const addedCruds = [...newPaths].filter(p => !existingPaths.has(p));
    const removedCruds = [...existingPaths].filter(p => !newPaths.has(p));

    if (addedCruds.length > 0) {
        console.log('\n➕ CRUDs Agregados:');
        addedCruds.forEach(c => console.log(`   - ${c}`));
    }
    if (removedCruds.length > 0) {
        console.log('\n➖ CRUDs Eliminados:');
        removedCruds.forEach(c => console.log(`   - ${c}`));
    }
    if (addedCruds.length === 0 && removedCruds.length === 0 && existingPaths.size > 0) {
        console.log('\n🔄 No se detectaron cambios en los registros.');
    }

} catch (err) {
    console.error(`\n❌ Error al escribir el archivo de registro:`, err);
}

console.log('\n✨ Proceso completado.');