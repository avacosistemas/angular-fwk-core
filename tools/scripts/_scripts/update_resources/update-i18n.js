const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'resources');
const importLine = 'import { I18n } from "@avacosistemas/core";\n\n';

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith('.i18n.ts')) {
            updateI18nFile(filePath);
        }
    });
}

function updateI18nFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(': I18n')) {
        console.log(`- Saltando (ya tipado): ${path.relative(process.cwd(), filePath)}`);
        return;
    }

    if (!content.includes('from "@avacosistemas/core"')) {
        content = importLine + content;
    }

    const updatedContent = content.replace(
        /export\s+const\s+([A-Z0-9_]+_I18N_DEF)\s*=\s*{/g,
        'export const $1: I18n = {'
    );

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Actualizado: ${path.relative(process.cwd(), filePath)}`);
    } else {
        console.log(`⚠️  No se encontró la constante _I18N_DEF en: ${path.relative(process.cwd(), filePath)}`);
    }
}

console.log('🚀 Iniciando actualización de archivos .i18n.ts...');
if (fs.existsSync(targetDir)) {
    processDirectory(targetDir);
    console.log('\n✨ Proceso completado.');
} else {
    console.error('❌ Error: No se encontró la carpeta src/app/resources');
}