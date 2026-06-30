const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'resources');
const importLine = 'import { GridDef } from "@fwk/model/component-def/grid-def";\n\n';

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith('.grid.ts')) {
            updateGridFile(filePath);
        }
    });
}

function updateGridFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(': GridDef')) {
        console.log(`- Saltando (ya tipado): ${path.relative(process.cwd(), filePath)}`);
        return;
    }
    if (!content.includes('from "@fwk/model/component-def/grid-def"')) {
        content = importLine + content;
    }

    const updatedContent = content.replace(
        /export\s+const\s+([A-Z0-9_]+_GRID_DEF)\s*=\s*{/g,
        'export const $1: GridDef = {'
    );

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Actualizado: ${path.relative(process.cwd(), filePath)}`);
    } else {
        console.log(`⚠️  No se encontró la constante _GRID_DEF en: ${path.relative(process.cwd(), filePath)}`);
    }
}

console.log('🚀 Iniciando actualización de archivos .grid.ts...');
if (fs.existsSync(targetDir)) {
    processDirectory(targetDir);
    console.log('\n✨ Proceso completado.');
} else {
    console.error('❌ Error: No se encontró la carpeta src/app/resources');
}