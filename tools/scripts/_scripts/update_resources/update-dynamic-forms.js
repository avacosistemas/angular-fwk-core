const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'resources');

const CONFIG = {
    fields: {
        suffix: '.fields.ts',
        importLine: 'import { DynamicField } from "@fwk/model/dynamic-form/dynamic-field";\n',
        typeName: 'DynamicField<any>[]',
        regex: /export\s+const\s+([A-Z0-9_]+(?:_FIELDS|_FIELDS_DEF|_FIELDS_DEF_FIELD))\s*(?::\s*[^=]+)?\s*=\s*(?:\r?\n\s*)?\[/g
    },
    behavior: {
        suffix: '.behavior.ts',
        importLine: 'import { DynamicFieldBehavior } from "@fwk/model/dynamic-form/dynamic-field-behavior";\n',
        typeName: 'DynamicFieldBehavior[]',
        regex: /export\s+const\s+([A-Z0-9_]+(?:_BEHAVIOR|_BEHAVIOR_DEF))\s*(?::\s*[^=]+)?\s*=\s*(?:\r?\n\s*)?\[/g
    }
};

function processDirectory(directory) {
    if (!fs.existsSync(directory)) return;
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith(CONFIG.fields.suffix)) {
            updateFile(filePath, CONFIG.fields);
        } else if (file.endsWith(CONFIG.behavior.suffix)) {
            updateFile(filePath, CONFIG.behavior);
        }
    });
}

function updateFile(filePath, cfg) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(`: ${cfg.typeName}`)) {
        console.log(`- Saltando (ya tipado correctamente): ${path.relative(process.cwd(), filePath)}`);
        return;
    }

    const updatedContent = content.replace(cfg.regex, (match, p1) => {
        return `export const ${p1}: ${cfg.typeName} = [`;
    });

    if (content !== updatedContent) {
        if (!updatedContent.includes(cfg.importLine.trim())) {
            content = cfg.importLine + updatedContent;
        } else {
            content = updatedContent;
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Actualizado: ${path.relative(process.cwd(), filePath)}`);
    } else {
        console.log(`⚠️  No se pudo procesar la constante en: ${path.relative(process.cwd(), filePath)} (Probablemente el nombre no termina en _FIELDS o _BEHAVIOR)`);
    }
}

console.log('🚀 Iniciando actualización inteligente de Dynamic Forms...');
processDirectory(targetDir);
console.log('\n✨ Proceso completado.');