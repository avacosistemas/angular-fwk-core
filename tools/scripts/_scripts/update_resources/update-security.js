const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'resources');
const importLine = 'import { SecurityDef } from "@fwk/model/component-def/security-def";\n\n';

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith('.security.ts')) {
            updateSecurityFile(filePath);
        }
    });
}

function updateSecurityFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(': SecurityDef')) {
        console.log(`- Saltando (ya tipado): ${path.relative(process.cwd(), filePath)}`);
        return;
    }

    if (!content.includes('from "@fwk/model/component-def/security-def"')) {
        content = importLine + content;
    }

    const updatedContent = content.replace(
        /export\s+const\s+([A-Z0-9_]+_SECURITY_DEF)\s*=\s*{/g,
        'export const $1: SecurityDef = {'
    );

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Actualizado: ${path.relative(process.cwd(), filePath)}`);
    } else {
        console.log(`⚠️  No se encontró la constante _SECURITY_DEF en: ${path.relative(process.cwd(), filePath)}`);
    }
}

console.log('🚀 Iniciando actualización de archivos .security.ts...');
if (fs.existsSync(targetDir)) {
    processDirectory(targetDir);
    console.log('\n✨ Proceso completado.');
} else {
    console.error('❌ Error: No se encontró la carpeta src/app/resources');
}