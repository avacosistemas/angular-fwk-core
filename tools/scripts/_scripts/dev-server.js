// @fwk/_scripts/dev-server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const splitPascalCase = (str) => {
    if (!str) return '';
    return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
};

let chalk;
let ora;

async function importUxDependencies() {
    chalk = (await import('chalk')).default;
    ora = (await import('ora')).default;
}

const toCamelCase = (str) => str.replace(/[-_]([a-z])/g, g => g[1].toUpperCase());
const toClassName = (str) => { const camel = toCamelCase(str); return camel.charAt(0).toUpperCase() + camel.slice(1); };
const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');

const keyToLabel = (str) => {
    if (!str) return '';
    const spaced = str.replace(/([A-Z])/g, ' $1').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const toConstCase = (str) => {
    if (!str) return '';
    return str
        .replace(/([A-Z])/g, letter => `_${letter}`)
        .replace(/[\s-]/g, '_')
        .replace(/[^\w]/g, '')
        .replace(/__+/g, '_')
        .toUpperCase()
        .replace(/^_/, '');
};

importUxDependencies();

const app = express();
const port = 4201;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log('🚀 [DEV-API] Servidor de desarrollo iniciado.');

function objectToString(obj, indentLevel = 1) {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';

    if (typeof obj === 'string') {
        if (obj.startsWith('%%') && obj.endsWith('%%')) {
            return obj.slice(2, -2);
        }
        return `'${obj.replace(/'/g, "\\'")}'`;
    }

    if (typeof obj !== 'object') {
        return String(obj);
    }

    const indent = '    '.repeat(indentLevel);
    const indentClose = '    '.repeat(indentLevel - 1);

    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        const items = obj.map(item => `${indent}${objectToString(item, indentLevel + 1)}`).join(',\n');
        return `[\n${items}\n${indentClose}]`;
    }

    const props = Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
            const keyStr = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `'${key}'`;
            return `${indent}${keyStr}: ${objectToString(value, indentLevel + 1)}`;
        })
        .join(',\n');

    return `{\n${props}\n${indentClose}}`;
}

function buildDisplayedActionsConditionFromArray(actions) {
    if (!Array.isArray(actions)) return undefined;

    return actions
        .filter(action => action.displayCondition?.expression?.key)
        .map(action => {
            const expression = action.displayCondition.expression;
            return {
                key: action.actionNameKey,
                expression: {
                    ...expression,
                    compare: `%%FILTER_TYPE.${expression.compare}%%`
                }
            };
        });
}

const inferControlType = (key, value) => {
    const keyLower = key ? key.toLowerCase() : '';
    if (keyLower === 'id') return 'hidden';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
        if (keyLower.includes('date') || keyLower.includes('fecha')) {
            return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? 'datetimepicker' : 'datepicker';
        }
        if (keyLower.includes('email')) return 'email';
        if (keyLower.includes('color')) return 'color_picker';
        if (value.length > 100) return 'textarea';
    }
    return 'textbox';
};

function getEnvConfig() {
    try {
        const envPath = path.join(__dirname, '..', '..', '..', 'src', 'environments', 'environment.ts');
        const content = fs.readFileSync(envPath, 'utf8');
        const simpleValueRegex = (key) => new RegExp(`export const ${key}\\s*=\\s*['"](.*?)['"]`);
        const apiPrefixMatch = content.match(simpleValueRegex('PREFIX_DOMAIN_API'));
        if (!apiPrefixMatch) throw new Error('PREFIX_DOMAIN_API no encontrado.');
        const apiPrefix = apiPrefixMatch[1];
        const swaggerUrlMatch = content.match(simpleValueRegex('PREFIX_SWAGGER_API'));
        if (!swaggerUrlMatch) throw new Error('PREFIX_SWAGGER_API no encontrado.');
        const swaggerUrl = swaggerUrlMatch[1];
        return { apiPrefix, swaggerUrl };
    } catch (error) {
        console.error(`[DEV-API] Error al leer el archivo de entorno: ${error.message}`);
        return { apiPrefix: null, swaggerUrl: null };
    }
}

const parseFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        return parser.parse(content, { sourceType: "module", plugins: ["typescript"] });
    } catch (e) {
        console.error(`[DEV-API] Fallo al parsear AST de: ${filePath}`, e.message);
        return null;
    }
};

function astNodeToJsValue(node) {
    if (!node) return undefined;
    switch (node.type) {
        case 'StringLiteral':
        case 'NumericLiteral':
        case 'BooleanLiteral':
            return node.value;
        case 'NullLiteral':
            return null;
        case 'Identifier':
            if (node.name === 'undefined') return undefined;
            return `%%${node.name}%%`;
        case 'ObjectExpression':
            return node.properties.reduce((obj, prop) => {
                if (prop.type === 'ObjectProperty') {
                    const key = prop.key.name || prop.key.value;
                    obj[key] = astNodeToJsValue(prop.value);
                }
                return obj;
            }, {});
        case 'ArrayExpression':
            return node.elements.map(element => astNodeToJsValue(element));
        case 'BinaryExpression':
            if (node.operator === '+') {
                const left = astNodeToJsValue(node.left);
                const right = astNodeToJsValue(node.right);
                const leftStr = left.startsWith('%%') ? left.slice(2, -2) : `'${left}'`;
                const rightStr = right.startsWith('%%') ? right.slice(2, -2) : `'${right}'`;
                return `%%${leftStr} + ${rightStr}%%`;
            }
            return `%%${generate(node).code}%%`;
        case 'MemberExpression':
            return `%%${generate(node).code}%%`;
        case 'UnaryExpression':
            if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
                return -node.argument.value;
            }
            return `%%${generate(node).code}%%`;
        default:
            const code = generate(node).code;
            if (code) {
                return `%%${code}%%`;
            }
            return undefined;
    }
}

function resolveReferences(obj, context) {
    if (typeof obj === 'string' && obj.startsWith('%%') && obj.endsWith('%%')) {
        const varName = obj.slice(2, -2);
        return context[varName] !== undefined ? context[varName] : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => resolveReferences(item, context));
    }
    if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = resolveReferences(obj[key], context);
        }
        return newObj;
    }
    return obj;
}

function jsValueToASTNode(value) {
    if (value === null) return t.nullLiteral();
    if (value === undefined) return t.identifier('undefined');
    switch (typeof value) {
        case 'string':
            if (value.startsWith('%%') && value.endsWith('%%')) {
                const code = value.slice(2, -2).trim();
                try {
                    const parsed = parser.parseExpression(code);
                    return parsed;
                } catch (e) {
                    console.warn(`[DEV-API] No se pudo parsear la expresión '${code}' como AST. Se tratará como string literal.`);
                    return t.stringLiteral(code);
                }
            }
            return t.stringLiteral(value);
        case 'number': return t.numericLiteral(value);
        case 'boolean': return t.booleanLiteral(value);
        case 'object':
            if (Array.isArray(value)) return t.arrayExpression(value.map(jsValueToASTNode));
            const properties = Object.keys(value).map(key => {
                if (value[key] === undefined) return null;
                const astValue = jsValueToASTNode(value[key]);
                if (astValue === null) return null;
                return t.objectProperty(
                    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? t.identifier(key) : t.stringLiteral(key),
                    astValue
                );
            }).filter(Boolean);
            return t.objectExpression(properties);
        default: throw new Error(`Tipo de dato no soportado para conversión a AST: ${typeof value}`);
    }
}

async function updateVariableInFile(filePath, varName, newData) {
    if (!await fs.pathExists(filePath)) {
        console.warn(chalk.yellow(`[DEV-API] ADVERTENCIA: No se encontró el archivo ${filePath}. Saltando actualización.`));
        return;
    }

    const ast = parseFile(filePath);
    if (!ast) return;

    let variableFound = false;
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.node.id.name === varName) {
                variableFound = true;
                const objectExpression = path.node.init;

                if (t.isObjectExpression(objectExpression)) {
                    const existingProps = new Map(
                        objectExpression.properties.map(p => [(p.key.name || p.key.value), p])
                    );

                    for (const key in newData) {
                        if (Object.prototype.hasOwnProperty.call(newData, key)) {
                            const newValue = newData[key];
                            const newNode = jsValueToASTNode(newValue);

                            if (existingProps.has(key)) {
                                existingProps.get(key).value = newNode;
                            } else {
                                const newProperty = t.objectProperty(
                                    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? t.identifier(key) : t.stringLiteral(key),
                                    newNode
                                );
                                objectExpression.properties.push(newProperty);
                            }
                        }
                    }
                }
                path.stop();
            }
        }
    });

    if (!variableFound) {
        console.warn(chalk.yellow(`[DEV-API] ADVERTENCIA: No se encontró la variable '${varName}' en '${filePath}'.`));
        return;
    }

    const { code: tempCode } = generate(ast);

    const potentialImports = [
        { keyword: 'PREFIX_DOMAIN_API', path: 'environments/environment' },
        { keyword: 'PREFIX_STATS_API', path: 'environments/environment' },
        { keyword: 'FILTER_TYPE', path: '@fwk/services/filter-service/filter.service' }
    ];

    potentialImports.forEach(imp => {
        if (tempCode.includes(imp.keyword)) {
            let isAlreadyImported = false;
            traverse(ast, {
                ImportDeclaration(path) {
                    if (path.node.source.value === imp.path) {
                        if (path.node.specifiers.some(spec => spec.imported && spec.imported.name === imp.keyword)) {
                            isAlreadyImported = true;
                            path.stop();
                        }
                    }
                }
            });

            if (!isAlreadyImported) {
                console.log(chalk.gray(`   -> Inyectando import para '${imp.keyword}' en '${path.basename(filePath)}'.`));
                const importSpecifier = t.importSpecifier(t.identifier(imp.keyword), t.identifier(imp.keyword));
                const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral(imp.path));
                ast.program.body.unshift(importDeclaration);
            }
        }
    });

    const { code } = generate(ast, { retainLines: false, comments: true, jsescOption: { quotes: 'single' } });

    await fs.writeFile(filePath, code, 'utf8');
    console.log(chalk.blue(` -> Archivo '${path.basename(filePath)}' actualizado para la variable '${varName}'.`));
};

app.get('/api/dev/swagger-endpoints', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/swagger-endpoints');
    try {
        const { swaggerUrl } = getEnvConfig();
        if (!swaggerUrl) { return res.status(500).json({ message: 'PREFIX_SWAGGER_API no está configurado en environment.ts' }); }
        const response = await axios.get(swaggerUrl);
        const swaggerData = response.data;
        if (!swaggerData.paths) { return res.status(500).json({ message: 'El JSON de Swagger no contiene la propiedad "paths".' }); }
        const endpoints = Object.keys(swaggerData.paths).filter(p => swaggerData.paths[p].get).map(p => ({ path: p, summary: swaggerData.paths[p].get.summary || (swaggerData.paths[p].get.tags ? swaggerData.paths[p].get.tags[0] : 'Sin descripción') })).sort((a, b) => a.path.localeCompare(b.path));
        res.json(endpoints);
    } catch (error) {
        console.error('[DEV-API] Error obteniendo Swagger:', error.message);
        res.status(500).json({ message: 'No se pudo obtener la definición de Swagger.', error: error.message });
    }
});

app.post('/api/dev/scan-endpoint', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/scan-endpoint');
    const { endpoint, token } = req.body;
    const { apiPrefix } = getEnvConfig();
    if (!endpoint || !token || !apiPrefix) { return res.status(400).json({ message: 'Faltan parámetros: endpoint, token, apiPrefix' }); }
    try {
        const cleanEndpoint = endpoint.replace(/{\w+}/g, '');
        const pathWithoutPrefix = cleanEndpoint.replace(/^\/?(api\/)?/, '');
        const base = apiPrefix.endsWith('/') ? apiPrefix : `${apiPrefix}/`;
        const urlWithParams = `${base}${pathWithoutPrefix}?page=0&pageSize=1`;
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        const response = await axios.get(urlWithParams, config);
        const data = response.data.data || response.data;
        if (!Array.isArray(data) || data.length === 0) { return res.status(404).json({ message: 'La respuesta no contiene datos en la propiedad "data" o el array está vacío.' }); }
        const sample = data[0];
        const fields = Object.keys(sample).map(key => ({ key, value: sample[key], label: keyToLabel(key), type: typeof sample[key], controlType: inferControlType(key, sample[key]) }));
        const pageSize = response.data.page?.pageSize;
        const serverPagination = pageSize !== undefined && pageSize < 9999;
        const result = { fields, paginationSettings: { serverPagination, filterInMemory: !serverPagination } };
        res.json(result);
    } catch (error) {
        console.error(`[DEV-API] Error escaneando el endpoint ${endpoint}:`, error.message);
        res.status(500).json({ message: `Error al escanear el endpoint: ${error.response?.statusText || error.message}` });
    }
});


app.post('/api/dev/generate-crud', async (req, res) => {
    try {
        const config = req.body;
        console.log('\n[DEV-API] Petición recibida en /api/dev/generate-crud');

        const {
            name, pluralName, navGroup, navIcon, showInMenu, apiEndpoint,
            useCreate, useUpdate, useRead, fields,
            security, actionsConfig, advancedConfig, fieldsBehavior
        } = config;

        if (!fields || !Array.isArray(fields)) {
            throw new Error("La propiedad 'fields' no fue recibida o no es un array en el servidor.");
        }

        const pascalToCamel = (str) => str.charAt(0).toLowerCase() + str.slice(1);
        const pascalToSnake = (str) => str.replace(/[A-Z]/g, (letter, index) => index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`);

        const camelName = pascalToCamel(name);
        const fileName = pascalToSnake(name).replace(/_/g, '-');
        const constName = toConstCase(name);
        const navUrl = camelName;

        const templatesPath = path.join(__dirname, '..', '..', '@fwk', '_templates', 'crud_template');
        const resourcesPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources');

        const targetPath = path.join(resourcesPath, fileName);
        if (await fs.pathExists(targetPath)) {
            return res.status(409).json({ message: `El directorio para "${fileName}" ya existe.` });
        }

        await fs.copy(templatesPath, targetPath);

        const hasFilterBehavior = fieldsBehavior && fieldsBehavior.filter && fieldsBehavior.filter.length > 0;
        const hasCreateBehavior = fieldsBehavior && fieldsBehavior.create && fieldsBehavior.create.length > 0;
        const hasUpdateBehavior = fieldsBehavior && fieldsBehavior.update && fieldsBehavior.update.length > 0;

        const finalActions = (actionsConfig.actions || []).map((action, index) => {
            const safeName = action.name.toLowerCase().replace(/[\s-]/g, '_').replace(/[^\w]/g, '');
            const actionKey = `${constName}_grid_action_${safeName}`;

            const finalAction = {
                actionNameKey: actionKey,
                icon: action.icon ? (action.icon.includes(':') ? action.icon : `heroicons_outline:${action.icon}`) : undefined,
                actionType: action.type,
                actionSecurity: action.security || null,
            };

            if (action.requiresConfirm) {
                finalAction.confirm = { message: action.confirmMessage || `¿Está seguro de que desea ejecutar la acción: ${action.name}?` };
            }

            if (action.type === 'form_modal') {
                if (actionFormDefs.has(index)) {
                    finalAction.formDef = {
                        fields: actionFormDefs.get(index),
                        showSubmitContinue: action.showSubmitContinue
                    };
                }
                if (action.ws?.endpoint) {
                    finalAction.ws = {
                        key: `${actionKey}_ws`,
                        method: action.ws.method || 'POST',
                        url: action.ws.isRelative ? `%%PREFIX_DOMAIN_API + '${action.ws.endpoint}'%%` : action.ws.endpoint
                    };
                }
            } else if (action.type === 'redirect') {
                finalAction.redirect = {
                    url: action.redirect.endpoint,
                    openTab: action.redirect.openTab
                };
            } else if (action.ws?.endpoint) {
                finalAction.ws = {
                    key: `${actionKey}_ws`,
                    method: action.ws.method || 'POST',
                    url: action.ws.isRelative ? `%%PREFIX_DOMAIN_API + '${action.ws.endpoint}'%%` : action.ws.endpoint
                };
            }

            const querystringObject = (action.querystring || []).reduce((acc, curr) => {
                if (curr.paramKey && curr.paramValue) {
                    acc[curr.paramKey] = curr.paramValue;
                }
                return acc;
            }, {});

            if (Object.keys(querystringObject).length > 0) {
                if (finalAction.redirect) finalAction.redirect.querystring = querystringObject;
                if (finalAction.ws) finalAction.ws.querystring = querystringObject;
            }

            if (action.displayCondition?.expression?.key) {
                finalAction.displayCondition = action.displayCondition;
            }

            finalAction.actionNameValue = action.name;

            return finalAction;
        });

        const files = await fs.readdir(targetPath, { recursive: true });
        for (const file of files) {
            const filePath = path.join(targetPath, file);
            if ((await fs.stat(filePath)).isDirectory()) continue;

            if (file.endsWith('.fields.ts')) {
                const isCreate = file.includes('.create.');
                const isUpdate = file.includes('.update.');
                const isRead = file.includes('.read.');

                if ((isCreate && !useCreate) ||
                    (isUpdate && !useUpdate) ||
                    (isRead && !useRead)) {
                    await fs.remove(filePath);
                    continue;
                }
            }

            if (file.endsWith('.behavior.ts')) {
                const isCreate = file.includes('.create.');
                const isUpdate = file.includes('.update.');
                const isFilter = file.includes('.filter.');

                if ((isCreate && (!hasCreateBehavior || !useCreate)) ||
                    (isUpdate && (!hasUpdateBehavior || !useUpdate)) ||
                    (isFilter && !hasFilterBehavior)) {
                    await fs.remove(filePath);
                    continue;
                }
            }

            let content = await fs.readFile(filePath, 'utf8');
            const newFilePath = path.join(path.dirname(filePath), path.basename(filePath).replace(/__fileName__/g, fileName));

            content = content
                .replace(/__constName__/g, constName)
                .replace(/__fileName__/g, fileName);

            if (file.endsWith('.def.ts')) {
                if (!hasCreateBehavior || !useCreate) content = content.replace(/import .*_CREATE_FORM_BEHAVIOR_DEF.*;\r?\n/g, '');
                if (!hasUpdateBehavior || !useUpdate) content = content.replace(/import .*_UPDATE_FORM_BEHAVIOR_DEF.*;\r?\n/g, '');
                if (!hasFilterBehavior) content = content.replace(/import .*_FILTER_FORM_BEHAVIOR_DEF.*;\r?\n/g, '');

                if (!useCreate) content = content.replace(/import .*_CREATE_FORM_FIELDS_DEF.*;\r?\n/g, '');
                if (!useUpdate) content = content.replace(/import .*_UPDATE_FORM_FIELDS_DEF.*;\r?\n/g, '');
                if (!useRead) content = content.replace(/import .*_READ_FORM_FIELDS_DEF.*;\r?\n/g, '');

                let exportCsvString = '';
                if (advancedConfig.exportCsv === 'client') {
                    exportCsvString = `exportCsv: {\n        csvExportFileName: \`\${'${pluralName}'.replace(/\\s/g, '_')}.csv\`\n    },`;
                } else if (advancedConfig.exportCsv === 'server') {
                    exportCsvString = `exportCsv: {\n        csvExportFileName: \`\${'${pluralName}'.replace(/\\s/g, '_')}.csv\`,\n        ws: \`\${PREFIX_DOMAIN_API}${(apiEndpoint || camelName).replace(/^\/api\//, '').replace(/^\//, '')}/export\`\n    },`;
                }

                const rawEndpoint = (apiEndpoint || camelName);
                const cleanEndpoint = rawEndpoint
                    .replace(/^\/api\//, '')
                    .replace(/^\//, '');

                content = content
                    .replace(/__apiEndpoint__/g, cleanEndpoint)
                    .replace(/__formCreate__/g, useCreate ? `create: ${constName}_CREATE_FORM_FIELDS_DEF,` : '')
                    .replace(/__createBehavior__/g, (useCreate && hasCreateBehavior) ? `createBehavior: ${constName}_CREATE_FORM_BEHAVIOR_DEF,` : '')
                    .replace(/__formUpdate__/g, useUpdate ? `update: ${constName}_UPDATE_FORM_FIELDS_DEF,` : '')
                    .replace(/__updateBehavior__/g, (useUpdate && hasUpdateBehavior) ? `updateBehavior: ${constName}_UPDATE_FORM_BEHAVIOR_DEF,` : '')
                    .replace(/__formRead__/g, useRead ? `read: ${constName}_READ_FORM_FIELDS_DEF` : '')
                    .replace(/__filterBehavior__/g, (fields.some(f => f.inFilter) && hasFilterBehavior) ? `filterBehavior: ${constName}_FILTER_FORM_BEHAVIOR_DEF,` : '')
                    .replace(/__filterInMemory__/g, advancedConfig.filterInMemory)
                    .replace(/__serverPagination__/g, advancedConfig.serverPagination)
                    .replace(/__cancelInitSearch__/g, advancedConfig.cancelInitSearch)
                    .replace(/__pageSize__/g, advancedConfig.pageSize)
                    .replace('width: \'600px\'', `width: '${advancedConfig.dialogWidth}'`)
                    .replace(/__exportCsv__/g, exportCsvString);

            } else if (file.endsWith('.grid.ts')) {
                const gridFields = fields.filter(f => f.inGrid);
                const displayedColumnsString = gridFields.map(c => `'${c.key}'`).join(',\n    ');
                let needsApiPrefixImport = false;
                let needsFilterTypeImport = false;

                const actionsForGrid = finalActions.map(action => {
                    const { actionNameValue, displayCondition, ...actionForFile } = action;
                    if (action.ws?.url?.includes('PREFIX_DOMAIN_API')) needsApiPrefixImport = true;
                    if (displayCondition) needsFilterTypeImport = true;
                    return actionForFile;
                });
                const actionsString = objectToString(actionsForGrid, 2);

                const displayedActionsCondition = buildDisplayedActionsConditionFromArray(finalActions);
                const displayedActionsConditionString = displayedActionsCondition && displayedActionsCondition.length > 0
                    ? `displayedActionsCondition: ${objectToString(displayedActionsCondition, 2)},`
                    : '';

                if (needsApiPrefixImport) {
                    content = `import { PREFIX_DOMAIN_API } from "environments/environment";\n${content}`;
                }
                if (needsFilterTypeImport) {
                    content = `import { FILTER_TYPE } from "@fwk/services/filter-service/filter.service";\n${content}`;
                }

                content = content
                    .replace(/__deleteAction__/g, actionsConfig.deleteAction)
                    .replace(/actionCellClass: ''/g, `actionCellClass: '${advancedConfig.actionCellClass || ''}'`)
                    .replace(/groupActions: true/g, `groupActions: ${actionsConfig.groupActions}`)
                    .replace(/columnsDef: \[[^\]]*\]/s, `columnsDef: ${generateGridColumnsString(fields, constName)}`)
                    .replace(/displayedColumns: \[[^\]]*\]/s, `displayedColumns: [\n    ${displayedColumnsString}\n  ]`)
                    .replace(/actions: \[[^\]]*\]/s, `actions: ${actionsString}`)
                    .replace(/\/\*[\s\S]*?displayedActionsCondition:[\s\S]*?\*\//, displayedActionsConditionString);

            } else if (file.includes(path.join('form', '')) && file.endsWith('.fields.ts')) {
                const formType = path.basename(file).split('.')[1];
                let relevantFields = [];
                switch (formType) {
                    case 'filter': relevantFields = fields.filter(f => f.inFilter); break;
                    case 'create': relevantFields = fields.filter(f => f.key.toLowerCase() !== 'id'); break;
                    case 'update': case 'read': relevantFields = fields; break;
                    default: relevantFields = [];
                }

                const fieldsString = generateFieldsString(relevantFields, constName, formType);

                let imports = `import { DynamicField } from "@fwk/model/dynamic-form/dynamic-field";\n`;

                if (content.includes('PREFIX_DOMAIN_API') || fieldsString.includes('PREFIX_DOMAIN_API')) {
                    imports += `import { PREFIX_DOMAIN_API } from "environments/environment";\n`;
                }

                content = imports + content;
                content = content.replace(/\s*=\s*\[\]/, fieldsString);

            } else if (file.endsWith('.i18n.ts')) {
                content = content.replace(/__i18nWords__/g, generateI18nWords(fields, pluralName, fileName, constName, finalActions));

            } else if (file.endsWith('.nav.ts')) {
                const iconString = navIcon ? `'${'heroicons_outline:' + navIcon}'` : 'null';
                content = content
                    .replace(/__camelName__/g, camelName)
                    .replace(/__navGroup__/g, navGroup)
                    .replace(/__navIcon__/g, iconString)
                    .replace(/__navUrl__/g, navUrl)
                    .replace(/__showInMenu__/g, showInMenu);
            } else if (file.endsWith('.security.ts')) {
                const secDef = security.customize
                    ? `{\n  readAccess: ${security.readAccess ? `'${security.readAccess}'` : 'null'},\n  updateAccess: ${useUpdate && security.updateAccess ? `'${security.updateAccess}'` : 'null'},\n  createAccess: ${useCreate && security.createAccess ? `'${security.createAccess}'` : 'null'},\n  deleteAccess: ${actionsConfig.deleteAction && security.deleteAccess ? `'${security.deleteAccess}'` : 'null'}\n}`
                    : `{\n  readAccess: '${constName}_READ',\n  updateAccess: ${useUpdate ? `'${constName}_UPDATE'` : 'null'},\n  createAccess: ${useCreate ? `'${constName}_CREATE'` : 'null'},\n  deleteAccess: ${actionsConfig.deleteAction ? `'${constName}_DELETE'` : 'null'}\n}`;
                content = content.replace(/__securityDef__/g, secDef);
            }

            await fs.writeFile(newFilePath, content, 'utf8');
            if (filePath !== newFilePath) await fs.remove(filePath);
        }

        console.log(`[DEV-API] Archivos de CRUD generados en ${targetPath}`);

        const spinner = ora('Actualizando registros y notificando al servidor de desarrollo...').start();
        await new Promise(resolve => setTimeout(resolve, 500));

        exec('npm run generate:registries', async (error, stdout, stderr) => {
            if (error) {
                spinner.fail(chalk.red('CRUD generado, pero falló la regeneración del registro.'));
                console.error(`[DEV-API] Error al regenerar registros: ${stderr}`);
                return res.status(500).json({ message: 'CRUD generado, pero falló la regeneración del registro.', error: stderr });
            }

            spinner.succeed(chalk.green('Registros actualizados.'));
            console.log(stdout);

            try {
                await new Promise(resolve => setTimeout(resolve, 500));

                const appRoutesPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'app.routes.ts');
                fs.utimesSync(appRoutesPath, new Date(), new Date());

                spinner.succeed(chalk.green('Servidor de Angular notificado para recargar.'));

                res.json({ success: true, message: `CRUD "${pluralName}" generado. Recargando la aplicación...` });

            } catch (touchError) {
                spinner.fail(chalk.red('No se pudo notificar al servidor de Angular para recargar.'));
                console.error(`[DEV-API] Error al "tocar" app.routes.ts:`, touchError);
                res.status(500).json({ message: 'CRUD generado, pero falló la recarga automática.', error: touchError.message });
            }
        });

    } catch (error) {
        console.error('[DEV-API] Error crítico generando CRUD:', error);
        res.status(500).json({ message: 'Error interno al generar el CRUD.', error: error.message, stack: error.stack });
    }
});

function generateBehaviorString(behaviorData, allFields, formType, constName) {
    if (!behaviorData || !behaviorData[formType] || behaviorData[formType].length === 0) return '[]';

    const relevantBehaviors = behaviorData[formType];
    const behaviorString = objectToString(relevantBehaviors);

    const needsImport = behaviorString.includes('FILTER_TYPE');
    if (needsImport) {
        return `import { FILTER_TYPE } from '@fwk/services/filter-service/filter.service';\n\nexport const ${constName}_${formType.toUpperCase()}_FORM_BEHAVIOR_DEF = ${behaviorString};`;
    }

    return `: DynamicFieldBehavior[] = ${behaviorString}`;
}

function generateFieldsString(fields, constName, formType) {
    if (!fields || fields.length === 0) return '[]';

    const fieldObjects = fields.map(f => {
        let finalControlType = f.controlType;
        let finalDisabled = formType === 'read';

        if (f.key.toLowerCase() === 'id') {
            if (formType === 'create') return null;
            if (formType === 'update' || formType === 'read') finalControlType = 'hidden';
            if (formType === 'read' || formType === 'update') finalDisabled = true;
        }

        const fieldDef = {
            key: f.key,
            labelKey: `${constName.toUpperCase()}_${formType.toUpperCase()}_FORM_FIELDS_DEF_FIELD_${f.key.toLowerCase()}`,
            controlType: finalControlType,
        };

        if (f.required && !finalDisabled) fieldDef.required = true;
        if (finalDisabled) fieldDef.disabled = true;
        if (f.mappingQuerystring) fieldDef.mappingQuerystring = true;
        if (f.cssClass) fieldDef.cssClass = f.cssClass;

        ['minLength', 'maxLength', 'minValue', 'maxValue', 'length'].forEach(key => {
            if (f[key] !== null && f[key] !== undefined && f[key] !== '') {
                fieldDef[key] = f[key];
            }
        });

        ['requiredMessage', 'minLengthMessage', 'maxLengthMessage', 'minValueMessage', 'maxValueMessage', 'lengthMessage'].forEach(key => {
            if (f[key]) fieldDef[key] = f[key];
        });

        if (f.validations && f.validations.pattern) {
            fieldDef.validations = [{
                key: 'pattern',
                input: `%%${f.validations.pattern}%%`
            }];
        }

        const options = {};

        if (formType === 'filter' && f.isBaseFilter) {
            options.baseFilter = true;
        }

        if (f.options) {
            if (f.options.dataSourceType === 'static' && f.options.fromData) {
                try {
                    options.fromData = typeof f.options.fromData === 'string' ? JSON.parse(f.options.fromData) : f.options.fromData;
                } catch (e) {
                    console.warn(`[DEV-API] JSON inválido para 'fromData' en el campo ${f.key}, se guardará como string.`);
                    options.fromData = f.options.fromData;
                }
            }

            if (f.options.fromWsUrl) {
                let cleanUrl = f.options.fromWsUrl
                    .replace(/PREFIX_DOMAIN_API\s*\+\s*/g, '')
                    .replace(/['"`]/g, '')
                    .trim();

                options.fromWs = {
                    key: `${constName}_${f.key.toUpperCase()}_URL`,
                    url: `%%PREFIX_DOMAIN_API + '${cleanUrl}'%%`
                };
            }

            ['elementLabel', 'elementValue', 'titleFrom', 'titleTo', 'placeholder', 'matLabel'].forEach(prop => {
                if (f.options[prop]) options[prop] = f.options[prop];
            });
        }

        if (Object.keys(options).length > 0) {
            fieldDef.options = options;
        }

        return fieldDef;
    }).filter(Boolean);

    const fieldsString = objectToString(fieldObjects);

    return `: DynamicField<any>[] = ${fieldsString}`;
}

function generateGridColumnsString(fields, constName) {
    const gridFields = fields.filter(f => f.inGrid);
    if (!gridFields || gridFields.length === 0) return '[]';

    const columnObjects = gridFields.map(f => {
        let colDef = {
            columnDef: f.key,
            columnNameKey: `${constName.toLowerCase()}_grid_def_column_${f.key.toLowerCase()}`
        };
        if (f.headerClass) colDef.headerClass = f.headerClass;
        if (f.cellClass) colDef.cellClass = f.cellClass;
        if (f.columnType && f.columnType !== 'text') colDef.columnType = f.columnType;
        if (f.key.toLowerCase() === 'id') colDef.id = true;
        return colDef;
    });

    return objectToString(columnObjects);
}

function generateI18nWords(fields, pluralName, fileName, constName, actions) {
    const humanPluralName = splitPascalCase(pluralName);

    const pageTitle = `'page_title': '${humanPluralName}'`;
    const navDef = `'${fileName}_nav_def': '${humanPluralName}'`;

    const gridWords = fields.filter(f => f.inGrid).map(field => `    '${constName.toLowerCase()}_grid_def_column_${field.key.toLowerCase()}': '${field.label}'`).join(',\n');

    const formTypes = ['create', 'update', 'read', 'filter'];
    const formWords = fields.flatMap(field => formTypes.map(type => `'${constName.toUpperCase()}_${type.toUpperCase()}_FORM_FIELDS_DEF_FIELD_${field.key.toLowerCase()}': '${field.label}'`)).join(',\n    ');

    const actionWords = (actions || []).map((action) => {
        if (!action.actionNameValue) return null;
        return `    '${action.actionNameKey}': '${action.actionNameValue}'`;
    }).filter(Boolean).join(',\n');

    return [pageTitle, navDef, gridWords, formWords, actionWords].filter(Boolean).join(',\n    ');
}

app.get('/api/dev/navigation-groups', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/navigation-groups (GET)');
    try {
        const navGroupsPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', 'navigation.groups.ts');
        const content = await fs.readFile(navGroupsPath, 'utf8');
        const arrayContentMatch = content.match(/export const NAVIGATION_GROUPS_MAP: NavigationGroup\[]\s*=\s*(\[[\s\S]*?\]);/);
        if (!arrayContentMatch || !arrayContentMatch[1]) { throw new Error('No se pudo encontrar o parsear el array NAVIGATION_GROUPS_MAP.'); }
        const arrayString = arrayContentMatch[1];
        const groups = eval(arrayString);
        res.json(groups);
    } catch (error) {
        console.error('[DEV-API] Error obteniendo grupos de navegación:', error.stack);
        res.status(500).json({ message: 'No se pudo leer el archivo de grupos de navegación.', error: error.message });
    }
});

app.post('/api/dev/generate-dashboard', async (req, res) => {
    try {
        const config = req.body;
        console.log('\n[DEV-API] Petición recibida en /api/dev/generate-dashboard');
        const {
            fileName, pageTitle, navGroup, navIcon, showInMenu, security, widgets
        } = config;

        if (!fileName || !pageTitle || !navGroup || !widgets || !Array.isArray(widgets) || !security) {
            return res.status(400).json({ message: 'La configuración del dashboard es incompleta o inválida.' });
        }

        const toCamelCase = (str) => str.replace(/[-_]([a-z])/g, g => g[1].toUpperCase());
        const constName = toConstCase(fileName);
        const camelName = toCamelCase(fileName);
        const navUrl = camelName;

        const resourcesPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources');
        const targetPath = path.join(resourcesPath, fileName);

        if (await fs.pathExists(targetPath)) {
            return res.status(409).json({ message: `El directorio para "${fileName}" ya existe.` });
        }

        await fs.copy(path.join(__dirname, '..', '..', '@fwk', '_templates', 'dashboard_template'), targetPath);

        const filterConstants = new Map();
        const i18nWidgetTitles = [];

        const widgetsWithDetails = widgets.map(w => {
            const widgetConstName = toConstCase(w.widgetTitle);
            const widgetTitleKey = `${fileName.replace(/-/g, '_')}_widget_${w.widgetTitle.toLowerCase().replace(/[ -]/g, '_')}`;
            i18nWidgetTitles.push({ key: widgetTitleKey, value: w.widgetTitle });

            const widgetDef = {
                type: w.widgetType,
                size: w.widgetSize,
                titleKey: widgetTitleKey,
                ws: {
                    key: `${widgetConstName}_URL`,
                    url: `%%PREFIX_STATS_API + '${w.widgetEndpoint}'%%`
                }
            };

            if (w.hasFilters && w.filters && w.filters.length > 0) {
                const filterConstName = `${constName}_${widgetConstName}_FILTERS`;
                const filterOptions = w.filters.map(f => ({
                    value: f.value || 'all',
                    viewValue: f.viewValue
                }));
                filterConstants.set(filterConstName, filterOptions);

                widgetDef.filterConfig = {
                    show: true,
                    options: `%%${filterConstName}%%`,
                    defaultOption: filterOptions[0].value,
                };
            }
            return widgetDef;
        });

        let filterConstantsString = '';
        if (filterConstants.size > 0) {
            filterConstants.forEach((options, name) => {
                filterConstantsString += `export const ${name} = ${objectToString(options)};\n\n`;
            });
        }

        const widgetsDefString = objectToString(widgetsWithDetails);

        const navDefKey = `${fileName.replace(/-/g, '_')}_nav_def`;
        const i18nWords = {
            'page_title': pageTitle,
            [navDefKey]: pageTitle,
            ...i18nWidgetTitles.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
        };

        const i18nWordsString = objectToString(i18nWords, 2);

        const replacements = {
            '__constName__': constName,
            '__fileName__': fileName,
            '__navGroup__': navGroup,
            '__navIcon__': navIcon ? `'heroicons_outline:${navIcon}'` : 'null',
            '__navUrl__': navUrl,
            '__showInMenu__': showInMenu,
            '__camelName__': camelName,
        };

        const files = await fs.readdir(targetPath, { recursive: true });

        for (const file of files) {
            const filePath = path.join(targetPath, file);
            if ((await fs.stat(filePath)).isDirectory()) continue;

            const newFilePath = path.join(path.dirname(filePath), path.basename(filePath).replace('__fileName__', fileName));
            let content = await fs.readFile(filePath, 'utf8');

            if (file.endsWith('layout.ts')) {
                content = content.replace('__filterConstants__', filterConstantsString.trim());
                content = content.replace(/widgets:\s*\[\s*__widgetsDef__\s*\]/s, `widgets: ${widgetsDefString}`);
            } else if (file.endsWith('i18n.ts')) {
                content = content.replace(/words:\s*{\s*__i18nWords__\s*}/s, `words: ${i18nWordsString}`);
            }
            else if (file.endsWith('security.ts')) {
                const readAccess = security.customize ? (security.readAccess ? `'${security.readAccess}'` : 'null') : `'${constName}_READ'`;
                content = content.replace(/readAccess: '.*'/, `readAccess: ${readAccess}`);
            } else if (file.endsWith('nav.ts')) {
                content = content.replace(/translateKey: '__translateKey__',/, `translateKey: '${navDefKey}',`);
            }

            for (const key in replacements) {
                const value = replacements[key];
                content = content.replace(new RegExp(key, 'g'), value === null ? 'null' : String(value));
            }

            await fs.writeFile(newFilePath, content, 'utf8');
            if (filePath !== newFilePath) await fs.remove(filePath);
        }

        console.log(`[DEV-API] Archivos de Dashboard generados en ${targetPath}`);

        const spinner = ora('Actualizando registros y notificando al servidor de desarrollo...').start();

        exec('npm run generate:registries', async (error, stdout, stderr) => {
            if (error) {
                spinner.fail(chalk.red('CRUD generado, pero falló la regeneración del registro.'));
                console.error(`[DEV-API] Error: ${stderr}`);
                return res.status(500).json({ message: 'Error en registros.', error: stderr });
            }

            spinner.succeed(chalk.green('Registros actualizados.'));

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));

                const now = new Date();

                const appRoutesPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'app.routes.ts');
                if (await fs.pathExists(appRoutesPath)) {
                    await fs.utimes(appRoutesPath, now, now);
                    console.log(chalk.gray('   -> app.routes.ts actualizado (touch).'));
                }

                const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
                if (await fs.pathExists(angularJsonPath)) {
                    await fs.utimes(angularJsonPath, now, now);
                    console.log(chalk.gray('   -> angular.json actualizado (touch - forzando rebuild profundo).'));
                }

                spinner.succeed(chalk.green('Recompilación forzada enviada al CLI de Angular.'));

                res.json({ success: true, message: `CRUD "${pluralName}" generado. La aplicación se recargará en breve.` });

            } catch (touchError) {
                console.error(`[DEV-API] Error al forzar recarga:`, touchError);
                res.json({ success: true, message: 'CRUD generado (pero deberás reiniciar ng serve manualmente).' });
            }
        });

    } catch (error) {
        console.error('[DEV-API] Error crítico generando Dashboard:', error);
        res.status(500).json({ message: 'Error interno al generar el Dashboard.', error: error.message, stack: error.stack });
    }
});

app.post('/api/dev/navigation-groups', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/navigation-groups (POST)');
    try {
        const { groups } = req.body;
        if (!Array.isArray(groups)) { return res.status(400).json({ message: 'El cuerpo de la petición debe contener un array "groups".' }); }
        const navGroupsPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', 'navigation.groups.ts');
        const newGroupsString = groups.map(g => {
            const iconPart = g.icon ? `\n        icon: '${g.icon}',` : '';
            return `    {\n        id: '${g.id}',\n        title: '${g.title}',\n        type: 'group',${iconPart}\n    }`;
        }).join(',\n');
        const newFileContent = `import { FwkNavigationItem } from '@fwk-layout/components/navigation';

export interface NavigationGroup extends FwkNavigationItem {
    id: string;
    title: string;
    type: 'group';
    icon?: string;
    children?: FwkNavigationItem[]; 
}

export const NAVIGATION_GROUPS_MAP: NavigationGroup[] = [
${newGroupsString}
];
`;
        await fs.writeFile(navGroupsPath, newFileContent, 'utf8');
        console.log(`[DEV-API] Archivo navigation.groups.ts actualizado con ${groups.length} grupos.`);
        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        res.json({ success: true, message: 'Grupos de navegación actualizados. El servidor se está recargando.' });
    } catch (error) {
        console.error('[DEV-API] Error actualizando grupos de navegación:', error.message);
        res.status(500).json({ message: 'No se pudo escribir en el archivo de grupos de navegación.', error: error.message });
    }
});

app.get('/api/dev/definitions', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/definitions');
    try {
        const resourcesPath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources');
        const entries = await fs.readdir(resourcesPath, { withFileTypes: true });
        const directories = entries.filter(dirent => dirent.isDirectory() && dirent.name !== 'navigation.groups.ts').map(dirent => dirent.name);
        const definitions = (await Promise.all(directories.map(async (dir) => {
            const defPath = path.join(resourcesPath, dir, `${dir}.def.ts`);
            if (await fs.pathExists(defPath)) {
                return { id: dir, name: dir.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
            }
            return null;
        }))).filter(Boolean);
        definitions.sort((a, b) => a.name.localeCompare(b.name));
        res.json(definitions);
    } catch (error) {
        res.status(500).json({ message: 'No se pudieron listar las definiciones.', error: error.message });
    }
});

app.get('/api/dev/definition/:name', async (req, res) => {
    const { name } = req.params;
    console.log(`\n[DEV-API] Petición para obtener definición: ${name}`);
    try {
        const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
        const constName = toConstCase(name);
        const finalDefinition = { forms: {} };

        const mainDefAST = parseFile(path.join(resourcePath, `${name}.def.ts`));

        if (mainDefAST) {
            traverse(mainDefAST, {
                VariableDeclarator(path) {
                    if (path.node.id.name === `${constName}_DEF` && t.isObjectExpression(path.node.init)) {
                        const props = path.node.init.properties;
                        [
                            'serverPagination',
                            'filterInMemory',
                            'cancelInitSearch',
                            'exportCsv',
                            'dialogConfig',
                            'pagination'
                        ].forEach(key => {
                            const prop = props.find(p => p.key.name === key);
                            if (prop) {
                                finalDefinition[key] = astNodeToJsValue(prop.value);
                            }
                        });

                        path.stop();
                    }
                }
            });
        }

        const extractVariableFromFile = async (filePath, varName) => {
            if (!await fs.pathExists(filePath)) return null;
            const ast = parseFile(filePath);
            if (!ast) return null;
            let foundNode = null;
            traverse(ast, {
                VariableDeclarator(path) {
                    if (path.node.id.name === varName) {
                        foundNode = path.node.init; path.stop();
                    }
                }
            });
            return astNodeToJsValue(foundNode);
        };

        finalDefinition.navigation = await extractVariableFromFile(path.join(resourcePath, 'navigation', `${name}.nav.ts`), `${constName}_NAV_DEF`);
        finalDefinition.security = await extractVariableFromFile(path.join(resourcePath, 'security', `${name}.security.ts`), `${constName}_SECURITY_DEF`);

        finalDefinition.i18n = await extractVariableFromFile(path.join(resourcePath, 'i18n', `${name}.i18n.ts`), `${constName}_I18N_DEF`);

        const enrichWithI18nValues = (items, keyProp, valueProp) => {
            if (!Array.isArray(items) || !finalDefinition.i18n?.words) return;
            items.forEach(item => {
                if (item && item[keyProp]) {
                    item[valueProp] = finalDefinition.i18n.words[item[keyProp]] || `[Clave no encontrada: ${item[keyProp]}]`;
                }
            });
        };

        if (finalDefinition.navigation && finalDefinition.i18n?.words && finalDefinition.navigation.translateKey) {
            finalDefinition.navigation.title = finalDefinition.i18n.words[finalDefinition.navigation.translateKey] || finalDefinition.navigation.translateKey;
        }

        const layoutFile = path.join(resourcePath, 'layout', `${name}.layout.ts`);
        if (await fs.pathExists(layoutFile)) {
            const layoutExports = await extractAllExportedVariables(layoutFile);
            const layoutDef = layoutExports[`${constName}_LAYOUT_DEF`];
            if (layoutDef) {
                const resolvedLayoutDef = resolveReferences(layoutDef, layoutExports);
                finalDefinition.dashboardConfig = resolvedLayoutDef;
            } else {
                finalDefinition.dashboardConfig = null;
            }
            enrichWithI18nValues(finalDefinition.dashboardConfig?.widgets, 'titleKey', 'titleValue');
        } else {
            finalDefinition.grid = await extractVariableFromFile(path.join(resourcePath, 'grid', `${name}.grid.ts`), `${constName}_GRID_DEF`);

            if (finalDefinition.grid?.displayedActionsCondition) {
                finalDefinition.grid.displayedActionsCondition.forEach(cond => {
                    if (cond.expression?.compare && cond.expression.compare.startsWith('FILTER_TYPE.')) {
                        cond.expression.compare = cond.expression.compare.split('.')[1];
                    }
                });
            }

            enrichWithI18nValues(finalDefinition.grid?.columnsDef, 'columnNameKey', 'columnNameValue');
            enrichWithI18nValues(finalDefinition.grid?.actions, 'actionNameKey', 'actionNameValue');

            for (const type of ['filter', 'create', 'update', 'read']) {
                const formData = await extractVariableFromFile(path.join(resourcePath, 'form', `${name}.${type}.fields.ts`), `${constName}_${type.toUpperCase()}_FORM_FIELDS_DEF`);
                finalDefinition.forms[type] = Array.isArray(formData) ? formData : [];
                enrichWithI18nValues(finalDefinition.forms[type], 'labelKey', 'labelValue');

                const behaviorFile = path.join(resourcePath, 'form', `${name}.${type}.behavior.ts`);
                if (await fs.pathExists(behaviorFile)) {
                    finalDefinition.forms[`${type}Behavior`] = await extractVariableFromFile(behaviorFile, `${constName}_${type.toUpperCase()}_FORM_BEHAVIOR_DEF`);
                }
            }
        }
        console.log(`[DEV-API] Definición completa de '${name}' parseada. Enviando al cliente.`);
        res.json(finalDefinition);
    } catch (error) {
        console.error(`[DEV-API] Error obteniendo la definición '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo parsear la definición '${name}'.`, error: error.message });
    }
});

app.post('/api/dev/definition/:name', async (req, res) => {
    const { name } = req.params;
    const { i18nUpdates, ...updates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR definición: ${name}`);
    console.log('[DEV-API] Payload de cambios recibido:', JSON.stringify(updates, null, 2));

    try {
        const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
        const constName = toConstCase(name);
        const mainDefAST = parseFile(path.join(resourcePath, `${name}.def.ts`));

        if (mainDefAST) {
            traverse(mainDefAST, {
                VariableDeclarator(path) {
                    if (path.node.id.name === `${constName}_DEF` && t.isObjectExpression(path.node.init)) {
                        const props = path.node.init.properties;

                        ['serverPagination', 'filterInMemory', 'cancelInitSearch', 'exportCsv', 'dialogConfig', 'pagination'].forEach(key => {
                            const prop = props.find(p => p.key.name === key);
                            if (prop) finalDefinition[key] = prop.value.value;
                        });

                        ['exportCsv', 'dialogConfig', 'pagination'].forEach(key => {
                            const prop = props.find(p => p.key.name === key);
                            if (prop) finalDefinition[key] = astNodeToJsValue(prop.value);
                        });

                        path.stop();
                    }
                }
            });
        }

        const mainDefFile = path.join(resourcePath, `${name}.def.ts`);
        const mainDefContent = await fs.readFile(mainDefFile, 'utf8');

        const allI18nUpdates = req.body.i18nUpdates || {};

        if (updates.navigation) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'navigation' en el endpoint general, pero será ignorado. Usa el endpoint específico.`));
            delete updates.navigation;
        }
        if (updates.security) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'security' en el endpoint general, pero será ignorado. Usa el endpoint específico.`));
            delete updates.security;
        }

        ['serverPagination', 'filterInMemory', 'cancelInitSearch', 'exportCsv', 'pageSize', 'dialogConfig'].forEach(key => {
            if (updates.hasOwnProperty(key)) {
                console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió '${key}' en el endpoint general, pero será ignorado.`));
                delete updates[key];
            }
        });


        if (updates.dashboardConfig) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'dashboardConfig' en el endpoint general, pero será ignorado.`));
            delete updates.dashboardConfig;
        }

        if (updates.grid) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'grid' en el endpoint general, pero será ignorado.`));
            delete updates.grid;
        }

        if (updates.forms) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'forms' en el endpoint general, pero será ignorado.`));
            delete updates.forms;
        }

        const mainDefUpdates = {};

        if (Object.keys(mainDefUpdates).length > 0) {
            await updateVariableInFile(path.join(resourcePath, `${name}.def.ts`), `${constName}_DEF`, mainDefUpdates);
        }

        if (allI18nUpdates && Object.keys(allI18nUpdates).length > 0) {
            const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
            const i18nAST = parseFile(i18nPath);
            if (i18nAST) {
                traverse(i18nAST, {
                    ObjectProperty(path) {
                        if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {

                            const wordsNode = path.node.value;
                            const existingKeys = new Set(
                                wordsNode.properties.map(prop => prop.key.name || prop.key.value)
                            );

                            wordsNode.properties.forEach(prop => {
                                if (t.isObjectProperty(prop)) {
                                    const keyName = prop.key.name || prop.key.value;
                                    if (allI18nUpdates.hasOwnProperty(keyName) && prop.value.value !== allI18nUpdates[keyName]) {
                                        prop.value = t.stringLiteral(String(allI18nUpdates[keyName]));
                                    }
                                }
                            });

                            for (const key in allI18nUpdates) {
                                if (!existingKeys.has(key)) {
                                    console.log(chalk.green(`   + Añadiendo nueva clave i18n: ${key}`));
                                    const newProperty = t.objectProperty(
                                        t.stringLiteral(key),
                                        t.stringLiteral(String(allI18nUpdates[key]))
                                    );
                                    wordsNode.properties.push(newProperty);
                                }
                            }

                            path.stop();
                        }
                    }
                });

                const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
                await fs.writeFile(i18nPath, newI18nCode, 'utf8');
                console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado.`));
            }
        }

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Definición "${name}" guardada exitosamente` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la definición '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la definición '${name}'.`, error: error.message });
    }
});

app.post('/api/dev/definition/:name', async (req, res) => {
    const { name } = req.params;
    const { i18nUpdates, ...updates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR definición: ${name}`);
    console.log('[DEV-API] Payload de cambios recibido:', JSON.stringify(updates, null, 2));

    try {
        const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
        const constName = toConstCase(name);
        const mainDefAST = parseFile(path.join(resourcePath, `${name}.def.ts`));

        if (mainDefAST) {
            traverse(mainDefAST, {
                VariableDeclarator(path) {
                    if (path.node.id.name === `${constName}_DEF` && t.isObjectExpression(path.node.init)) {
                        const props = path.node.init.properties;

                        ['serverPagination', 'filterInMemory', 'cancelInitSearch', 'exportCsv', 'dialogConfig', 'pagination'].forEach(key => {
                            const prop = props.find(p => p.key.name === key);
                            if (prop) finalDefinition[key] = prop.value.value;
                        });

                        ['exportCsv', 'dialogConfig', 'pagination'].forEach(key => {
                            const prop = props.find(p => p.key.name === key);
                            if (prop) finalDefinition[key] = astNodeToJsValue(prop.value);
                        });

                        path.stop();
                    }
                }
            });
        }

        const mainDefFile = path.join(resourcePath, `${name}.def.ts`);
        const mainDefContent = await fs.readFile(mainDefFile, 'utf8');

        const allI18nUpdates = req.body.i18nUpdates || {};

        if (updates.navigation) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'navigation' en el endpoint general, pero será ignorado. Usa el endpoint específico.`));
            delete updates.navigation;
        }
        if (updates.security) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'security' en el endpoint general, pero será ignorado. Usa el endpoint específico.`));
            delete updates.security;
        }

        ['serverPagination', 'filterInMemory', 'cancelInitSearch', 'exportCsv', 'pageSize', 'dialogConfig'].forEach(key => {
            if (updates.hasOwnProperty(key)) {
                console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió '${key}' en el endpoint general, pero será ignorado.`));
                delete updates[key];
            }
        });


        if (updates.dashboardConfig) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'dashboardConfig' en el endpoint general, pero será ignorado.`));
            delete updates.dashboardConfig;
        }

        if (updates.grid) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'grid' en el endpoint general, pero será ignorado.`));
            delete updates.grid;
        }

        if (updates.forms) {
            console.log(chalk.yellow(`[DEV-API] ADVERTENCIA: Se recibió 'forms' en el endpoint general, pero será ignorado.`));
            delete updates.forms;
        }

        const mainDefUpdates = {};

        if (Object.keys(mainDefUpdates).length > 0) {
            await updateVariableInFile(path.join(resourcePath, `${name}.def.ts`), `${constName}_DEF`, mainDefUpdates);
        }

        if (allI18nUpdates && Object.keys(allI18nUpdates).length > 0) {
            const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
            const i18nAST = parseFile(i18nPath);
            if (i18nAST) {
                traverse(i18nAST, {
                    ObjectProperty(path) {
                        if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {

                            const wordsNode = path.node.value;
                            const existingKeys = new Set(
                                wordsNode.properties.map(prop => prop.key.name || prop.key.value)
                            );

                            wordsNode.properties.forEach(prop => {
                                if (t.isObjectProperty(prop)) {
                                    const keyName = prop.key.name || prop.key.value;
                                    if (allI18nUpdates.hasOwnProperty(keyName) && prop.value.value !== allI18nUpdates[keyName]) {
                                        prop.value = t.stringLiteral(String(allI18nUpdates[keyName]));
                                    }
                                }
                            });

                            for (const key in allI18nUpdates) {
                                if (!existingKeys.has(key)) {
                                    console.log(chalk.green(`   + Añadiendo nueva clave i18n: ${key}`));
                                    const newProperty = t.objectProperty(
                                        t.stringLiteral(key),
                                        t.stringLiteral(String(allI18nUpdates[key]))
                                    );
                                    wordsNode.properties.push(newProperty);
                                }
                            }

                            path.stop();
                        }
                    }
                });

                const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
                await fs.writeFile(i18nPath, newI18nCode, 'utf8');
                console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado.`));
            }
        }

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Definición "${name}" guardada exitosamente` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la definición '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la definición '${name}'.`, error: error.message });
    }
});

app.get('/api/dev/i18n-main', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/i18n-main (GET)');
    try {
        const i18nPath = path.join(__dirname, '..', '..', '@fwk', 'i18n', 'fwk.i18n.ts');
        const indexPath = path.join(__dirname, '..', '..', '..', 'src', 'index.html');

        const indexContent = await fs.readFile(indexPath, 'utf8');
        const $ = cheerio.load(indexContent);
        const meta = {
            title: $('title').text(),
            description: $('meta[name="description"]').attr('content')
        };

        const i18nContent = await fs.readFile(i18nPath, 'utf8');
        const ast = parseFile(i18nPath);
        if (!ast) throw new Error('No se pudo parsear el AST de fwk.i18n.ts');

        let words = {};
        traverse(ast, {
            ObjectProperty(path) {
                if (path.node.key.name === 'words') {
                    words = astNodeToJsValue(path.node.value);
                    path.stop();
                }
            }
        });

        const categories = [];
        const categoryRegex = /\/\/\s*---\s*(.+?)\s*---/g;
        let match;

        while ((match = categoryRegex.exec(i18nContent)) !== null) {
            if (categories.length > 0) {
                categories[categories.length - 1].endIndex = match.index;
            }
            categories.push({ name: match[1], startIndex: match.index, endIndex: i18nContent.length, keys: [] });
        }

        if (categories.length === 0) {
            categories.push({ name: 'General', startIndex: 0, endIndex: i18nContent.length, keys: [] });
        }

        const lines = i18nContent.split('\n');

        Object.entries(words).forEach(([key, value]) => {
            const keyRegex = new RegExp(`'${key}'|"${key}"|${key}:`);
            const lineIndex = lines.findIndex(line => keyRegex.test(line));
            const charIndex = lineIndex !== -1 ? lines.slice(0, lineIndex).join('\n').length : -1;

            let assigned = false;
            for (const category of categories) {
                if (charIndex >= category.startIndex && charIndex < category.endIndex) {
                    category.keys.push({ key, value });
                    assigned = true;
                    break;
                }
            }
            if (!assigned && categories.length > 0) {
                categories[0].keys.push({ key, value });
            }
        });

        const finalCategories = categories.map(({ name, keys }) => ({ name, keys }));

        res.json({ meta, categories: finalCategories });

    } catch (error) {
        console.error('[DEV-API] Error obteniendo datos de I18N:', error.stack);
        res.status(500).json({ message: 'No se pudo leer la configuración principal de I18N.', error: error.message });
    }
});

app.post('/api/dev/i18n-main', async (req, res) => {
    console.log('\n[DEV-API] Petición recibida en /api/dev/i18n-main (POST)');
    try {
        const { meta, categories } = req.body;
        if (!meta || !Array.isArray(categories)) {
            return res.status(400).json({ message: 'El cuerpo de la petición es inválido.' });
        }

        const indexPath = path.join(__dirname, '..', '..', '..', 'src', 'index.html');
        const indexContent = await fs.readFile(indexPath, 'utf8');
        const $ = cheerio.load(indexContent);
        $('title').text(meta.title);
        $('meta[name="description"]').attr('content', meta.description);
        await fs.writeFile(indexPath, $.html(), 'utf8');
        console.log(' -> index.html actualizado.');

        const i18nPath = path.join(__dirname, '..', '..', '@fwk', 'i18n', 'fwk.i18n.ts');
        const ast = parseFile(i18nPath);
        if (!ast) throw new Error('No se pudo parsear el AST de fwk.i18n.ts');

        const newWordsObject = categories.flatMap(cat => cat.keys).reduce((obj, item) => {
            obj[item.key] = item.value;
            return obj;
        }, {});

        traverse(ast, {
            ObjectProperty(path) {
                if (path.node.key.name === 'words' && t.isObjectExpression(path.node.value)) {

                    const wordsNode = path.node.value;
                    const existingKeys = new Set();

                    wordsNode.properties.forEach(prop => {
                        if (t.isObjectProperty(prop)) {
                            const keyName = prop.key.name || prop.key.value;
                            existingKeys.add(keyName);

                            if (newWordsObject.hasOwnProperty(keyName) && prop.value.value !== newWordsObject[keyName]) {
                                prop.value = t.stringLiteral(String(newWordsObject[keyName]));
                            }
                        }
                    });

                    for (const key in newWordsObject) {
                        if (!existingKeys.has(key)) {
                            console.log(`[DEV-API] Añadiendo nueva clave i18n que no existía: ${key}`);
                            const newProperty = t.objectProperty(
                                t.stringLiteral(key),
                                t.stringLiteral(String(newWordsObject[key]))
                            );
                            wordsNode.properties.push(newProperty);
                        }
                    }
                    path.stop();
                }
            }
        });

        const { code } = generate(ast, {
            retainLines: false,
            comments: true,
            jsescOption: {
                quotes: 'single',
                minimal: true
            }
        });

        await fs.writeFile(i18nPath, code, 'utf8');
        console.log(' -> fwk.i18n.ts actualizado correctamente.');

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log('[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.');

        res.json({ success: true, message: 'Textos actualizados. El servidor se está recargando.' });

    } catch (error) {
        console.error('[DEV-API] Error guardando datos de I18N:', error.stack);
        res.status(500).json({ message: 'No se pudo guardar la configuración de I18N.', error: error.message });
    }
});

// navigation definition editor
async function updateNavFile(name, navigationData) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);
    const navPath = path.join(resourcePath, 'navigation', `${name}.nav.ts`);

    await updateVariableInFile(navPath, `${constName}_NAV_DEF`, navigationData);
}
async function updateNavI18nFile(name, i18nUpdates) {
    if (!i18nUpdates || Object.keys(i18nUpdates).length === 0) {
        return;
    }
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
    const i18nAST = parseFile(i18nPath);

    if (i18nAST) {
        traverse(i18nAST, {
            ObjectProperty(path) {
                if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {
                    path.node.value.properties.forEach(prop => {
                        if (t.isObjectProperty(prop)) {
                            const keyName = prop.key.name || prop.key.value;
                            if (i18nUpdates.hasOwnProperty(keyName) && prop.value.value !== i18nUpdates[keyName]) {
                                prop.value = t.stringLiteral(String(i18nUpdates[keyName]));
                            }
                        }
                    });
                    path.stop();
                }
            }
        });
        const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
        await fs.writeFile(i18nPath, newI18nCode, 'utf8');
        console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado para navegación.`));
    }
}
app.post('/api/dev/definition/:name/navigation', async (req, res) => {
    const { name } = req.params;
    const { navigationData, i18nUpdates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR NAVEGACIÓN de: ${name}`);

    try {
        let hasNavChanges = navigationData && Object.keys(navigationData).length > 0;
        let hasI18nChanges = i18nUpdates && Object.keys(i18nUpdates).length > 0;

        if (!hasNavChanges && !hasI18nChanges) {
            return res.status(400).json({ message: 'No se enviaron datos para actualizar.' });
        }

        if (hasNavChanges) {
            await updateNavFile(name, navigationData);
        }

        if (hasI18nChanges) {
            await updateNavI18nFile(name, i18nUpdates);
        }

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Navegación para "${name}" guardada.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la navegación de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la navegación de '${name}'.`, error: error.message });
    }
});

// security definition editor
async function updateSecurityFile(name, securityData) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);
    const securityPath = path.join(resourcePath, 'security', `${name}.security.ts`);
    await updateVariableInFile(securityPath, `${constName}_SECURITY_DEF`, securityData);
}
app.post('/api/dev/definition/:name/security', async (req, res) => {
    const { name } = req.params;
    const securityData = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR SEGURIDAD de: ${name}`);

    try {
        await updateSecurityFile(name, securityData);

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Seguridad para "${name}" guardada.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la seguridad de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la seguridad de '${name}'.`, error: error.message });
    }
});

// crud-config definition editor
async function updateCrudConfigFile(name, crudConfigData) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);

    const mainDefUpdates = {
        serverPagination: crudConfigData.serverPagination,
        filterInMemory: crudConfigData.filterInMemory,
        cancelInitSearch: crudConfigData.cancelInitSearch,
        pagination: {
            page: 0,
            pageSize: crudConfigData.pageSize
        },
        dialogConfig: { width: crudConfigData.dialogWidth }
    };

    if (crudConfigData.exportCsv) {
        let exportCsvValue = null;
        const { type, csvExportFileName, ws } = crudConfigData.exportCsv;
        if (type === 'client' && csvExportFileName) {
            exportCsvValue = {
                type: 'client',
                csvExportFileName: `%%'${csvExportFileName}.csv'%%`
            };
        } else if (type === 'server' && csvExportFileName) {
            exportCsvValue = {
                type: 'server',
                csvExportFileName: `%%'${csvExportFileName}.csv'%%`,
                ws: ws ? `%%PREFIX_DOMAIN_API + '${ws}'%%` : undefined
            };
        }
        mainDefUpdates.exportCsv = exportCsvValue;
    }
    await updateVariableInFile(path.join(resourcePath, `${name}.def.ts`), `${constName}_DEF`, mainDefUpdates);
}
app.post('/api/dev/definition/:name/crud-config', async (req, res) => {
    const { name } = req.params;
    const crudConfigData = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR CONFIG CRUD de: ${name}`);

    try {
        await updateCrudConfigFile(name, crudConfigData);

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Configuración de CRUD para "${name}" guardada.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la config de CRUD de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la config de CRUD de '${name}'.`, error: error.message });
    }
});

// grid-editor definition editor
async function updateGridFile(name, gridData, i18nUpdates) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);

    if (gridData?.columnsDef && Array.isArray(gridData.columnsDef)) {
        gridData.columnsDef.forEach(col => {
            delete col.columnNameValue;

            if (col.headerClass === '' || col.headerClass === null || col.headerClass === undefined) {
                delete col.headerClass;
            }
            if (col.cellClass === '' || col.cellClass === null || col.cellClass === undefined) {
                delete col.cellClass;
            }
            if (col.id === false || col.id === null || col.id === undefined) {
                delete col.id;
            }
            if (col.columnType === '' || col.columnType === null || col.columnType === undefined) {
                delete col.columnType;
            }
        });
    }

    if (gridData?.actions) {
        gridData.actions.forEach(action => {
            delete action.displayCondition;
        });

        const displayedActionsCondition = buildDisplayedActionsConditionFromArray(gridData.actions);
        if (displayedActionsCondition && displayedActionsCondition.length > 0) {
            gridData.displayedActionsCondition = displayedActionsCondition;
        } else {
            delete gridData.displayedActionsCondition;
        }
    }

    await updateVariableInFile(path.join(resourcePath, 'grid', `${name}.grid.ts`), `${constName}_GRID_DEF`, gridData);

    if (i18nUpdates && Object.keys(i18nUpdates).length > 0) {
        const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
        const i18nAST = parseFile(i18nPath);
        if (i18nAST) {
            traverse(i18nAST, {
                ObjectProperty(path) {
                    if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {
                        const wordsNode = path.node.value;
                        const existingKeys = new Set(wordsNode.properties.map(prop => prop.key.name || prop.key.value));

                        wordsNode.properties.forEach(prop => {
                            if (t.isObjectProperty(prop)) {
                                const keyName = prop.key.name || prop.key.value;
                                if (i18nUpdates.hasOwnProperty(keyName) && prop.value.value !== i18nUpdates[keyName]) {
                                    prop.value = t.stringLiteral(String(i18nUpdates[keyName]));
                                }
                            }
                        });

                        for (const key in i18nUpdates) {
                            if (!existingKeys.has(key)) {
                                console.log(chalk.green(`   + Añadiendo nueva clave i18n de grilla: ${key}`));
                                const newProperty = t.objectProperty(
                                    t.stringLiteral(key),
                                    t.stringLiteral(String(i18nUpdates[key]))
                                );
                                wordsNode.properties.push(newProperty);
                            }
                        }

                        path.stop();
                    }
                }
            });
            const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
            await fs.writeFile(i18nPath, newI18nCode, 'utf8');
            console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado para grilla.`));
        }
    }
}

app.post('/api/dev/definition/:name/grid', async (req, res) => {
    const { name } = req.params;
    const { gridData, i18nUpdates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR GRID de: ${name}`);

    try {
        await updateGridFile(name, gridData, i18nUpdates);

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Configuración de grilla para "${name}" guardada.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando la grilla de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la grilla de '${name}'.`, error: error.message });
    }
});

// form-editor definition editor
async function updateFormVariableInFile(filePath, varName, newData) {
    if (!await fs.pathExists(filePath)) {
        console.warn(chalk.yellow(`[DEV-API] ADVERTENCIA: No se encontró el archivo ${filePath}. Saltando actualización.`));
        return;
    }

    const ast = parseFile(filePath);
    if (!ast) return;

    let variableFound = false;
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.node.id.name === varName) {
                variableFound = true;
                path.node.init = jsValueToASTNode(newData);
                path.stop();
            }
        }
    });

    if (!variableFound) {
        console.warn(chalk.yellow(`[DEV-API] ADVERTENCIA: No se encontró la variable '${varName}' en '${filePath}'.`));
        return;
    }

    const { code: tempCode } = generate(ast);

    const potentialImports = [
        { keyword: 'PREFIX_DOMAIN_API', path: 'environments/environment' },
        { keyword: 'PREFIX_STATS_API', path: 'environments/environment' },
        { keyword: 'FILTER_TYPE', path: '@fwk/services/filter-service/filter.service' }
    ];

    potentialImports.forEach(imp => {
        if (tempCode.includes(imp.keyword)) {
            let isAlreadyImported = false;
            traverse(ast, {
                ImportDeclaration(path) {
                    if (path.node.source.value === imp.path) {
                        if (path.node.specifiers.some(spec => spec.imported && spec.imported.name === imp.keyword)) {
                            isAlreadyImported = true;
                            path.stop();
                        }
                    }
                }
            });

            if (!isAlreadyImported) {
                console.log(chalk.gray(`   -> Inyectando import para '${imp.keyword}' en '${path.basename(filePath)}'.`));
                const importSpecifier = t.importSpecifier(t.identifier(imp.keyword), t.identifier(imp.keyword));
                const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral(imp.path));
                ast.program.body.unshift(importDeclaration);
            }
        }
    });

    const { code } = generate(ast, { retainLines: false, comments: true, jsescOption: { quotes: 'single' } });

    await fs.writeFile(filePath, code, 'utf8');
    console.log(chalk.blue(` -> Archivo '${path.basename(filePath)}' actualizado para la variable '${varName}'.`));
}

async function updateFormsFile(name, formsData, i18nUpdates) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);
    const neededBehaviors = {};

    for (const type in formsData) {
        const isBehavior = type.endsWith('Behavior');
        const formType = isBehavior ? type.replace('Behavior', '') : type;
        const fileName = isBehavior ? `${name}.${formType}.behavior.ts` : `${name}.${formType}.fields.ts`;
        const varName = isBehavior ? `${constName}_${formType.toUpperCase()}_FORM_BEHAVIOR_DEF` : `${constName}_${formType.toUpperCase()}_FORM_FIELDS_DEF`;
        const filePath = path.join(resourcePath, 'form', fileName);

        if (isBehavior && formsData[type].length > 0) {
            neededBehaviors[formType] = true;
        }

        if (!await fs.pathExists(filePath) && isBehavior) {
            console.log(chalk.yellow(`[DEV-API] Creando archivo de behavior faltante: ${fileName}`));
            const templatePath = path.join(__dirname, '..', '..', '@fwk', '_templates', 'crud_template', 'form', `__fileName__.${formType}.behavior.ts`);
            let templateContent = await fs.readFile(templatePath, 'utf8');
            templateContent = templateContent.replace(/__constName__/g, constName).replace(/__fileName__/g, name);
            await fs.writeFile(filePath, templateContent, 'utf8');
        }

        if (await fs.pathExists(filePath)) {
            await updateFormVariableInFile(filePath, varName, formsData[type]);
        } else {
            console.warn(chalk.yellow(`[DEV-API] ADVERTENCIA: No se encontró el archivo ${filePath} y no es de tipo behavior. No se pudo crear/actualizar.`));
        }
    }

    const mainDefPath = path.join(resourcePath, `${name}.def.ts`);
    const mainDefAst = parseFile(mainDefPath);
    if (mainDefAst) {
        const requiredImports = [];
        for (const formType in neededBehaviors) {
            requiredImports.push({
                varName: `${constName}_${formType.toUpperCase()}_FORM_BEHAVIOR_DEF`,
                path: `./form/${name}.${formType}.behavior`
            });
        }

        const existingImports = new Set();
        traverse(mainDefAst, {
            ImportDeclaration(path) {
                const specifier = path.node.specifiers.find(s => s.local.name.endsWith('BEHAVIOR_DEF'));
                if (specifier) {
                    existingImports.add(specifier.local.name);
                }
            }
        });

        requiredImports.forEach(imp => {
            if (!existingImports.has(imp.varName)) {
                console.log(chalk.green(`   + Añadiendo import para: ${imp.varName}`));
                const importSpecifier = t.importSpecifier(t.identifier(imp.varName), t.identifier(imp.varName));
                const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral(imp.path));
                mainDefAst.program.body.unshift(importDeclaration);
            }
        });

        traverse(mainDefAst, {
            ObjectProperty(path) {
                if (path.node.key.name === 'forms' && t.isObjectExpression(path.node.value)) {
                    const formsObject = path.node.value;
                    const existingProps = new Set(formsObject.properties.map(p => p.key.name));

                    for (const formType in neededBehaviors) {
                        const propName = `${formType}Behavior`;
                        if (!existingProps.has(propName)) {
                            console.log(chalk.green(`   + Añadiendo propiedad: ${propName}`));
                            const newProperty = t.objectProperty(
                                t.identifier(propName),
                                t.identifier(`${constName}_${formType.toUpperCase()}_FORM_BEHAVIOR_DEF`)
                            );
                            formsObject.properties.push(newProperty);
                        }
                    }
                    path.stop();
                }
            }
        });

        const { code } = generate(mainDefAst, { jsescOption: { quotes: 'single' } });
        await fs.writeFile(mainDefPath, code, 'utf8');
        console.log(chalk.blue(` -> Archivo principal '${path.basename(mainDefPath)}' actualizado con imports/propiedades de behavior.`));
    }


    if (i18nUpdates && Object.keys(i18nUpdates).length > 0) {
        const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
        const i18nAST = parseFile(i18nPath);
        if (i18nAST) {
            traverse(i18nAST, {
                ObjectProperty(path) {
                    if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {
                        const wordsNode = path.node.value;
                        const existingKeys = new Set(
                            wordsNode.properties.map(prop => prop.key.name || prop.key.value)
                        );

                        wordsNode.properties.forEach(prop => {
                            if (t.isObjectProperty(prop)) {
                                const keyName = prop.key.name || prop.key.value;
                                if (i18nUpdates.hasOwnProperty(keyName) && prop.value.value !== i18nUpdates[keyName]) {
                                    prop.value = t.stringLiteral(String(i18nUpdates[keyName]));
                                }
                            }
                        });

                        for (const key in i18nUpdates) {
                            if (!existingKeys.has(key)) {
                                console.log(chalk.green(`   + Añadiendo nueva clave i18n de formulario: ${key}`));
                                const newProperty = t.objectProperty(
                                    t.stringLiteral(key),
                                    t.stringLiteral(String(i18nUpdates[key]))
                                );
                                wordsNode.properties.push(newProperty);
                            }
                        }

                        path.stop();
                    }
                }
            });
            const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
            await fs.writeFile(i18nPath, newI18nCode, 'utf8');
            console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado para formularios.`));
        }
    }
}

app.post('/api/dev/definition/:name/forms', async (req, res) => {
    const { name } = req.params;
    const { formsData, i18nUpdates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR FORMULARIOS de: ${name}`);

    try {
        await updateFormsFile(name, formsData, i18nUpdates);

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Formularios para "${name}" guardados.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando los formularios de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la configuración de formularios de '${name}'.`, error: error.message });
    }
});

async function extractAllExportedVariables(filePath) {
    const ast = parseFile(filePath);
    if (!ast) return {};
    const exports = {};
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.parentPath.parent.type === 'ExportNamedDeclaration') {
                if (t.isIdentifier(path.node.id)) {
                    exports[path.node.id.name] = astNodeToJsValue(path.node.init);
                }
            }
        }
    });
    return exports;
};

async function updateDashboardFile(name, dashboardData, i18nUpdates) {
    const resourcePath = path.join(__dirname, '..', '..', '..', 'src', 'app', 'resources', name);
    const constName = toConstCase(name);

    const filterConstants = new Map();
    const widgetsWithDetails = (dashboardData.widgets || []).map(w => {
        const widgetDef = {
            titleKey: w.titleKey,
            type: w.type,
            size: w.size,
            ws: {
                key: w.ws.key,
                url: `%%PREFIX_STATS_API + '${w.ws.url}'%%`
            }
        };

        if (w.filterConfig.show && w.filterConfig.options && w.filterConfig.options.length > 0) {
            const widgetConstName = toConstCase(w.titleValue);
            const filterConstName = `${constName}_${widgetConstName}_FILTERS`;
            filterConstants.set(filterConstName, w.filterConfig.options);
            widgetDef.filterConfig = {
                show: true,
                options: `%%${filterConstName}%%`,
                defaultOption: w.filterConfig.defaultOption,
            };
        }
        return widgetDef;
    });

    let filterConstantsString = '';
    if (filterConstants.size > 0) {
        filterConstants.forEach((options, constName) => {
            filterConstantsString += `export const ${constName} = ${objectToString(options)};\n\n`;
        });
    }

    const widgetsDefString = objectToString(widgetsWithDetails);

    const layoutFilePath = path.join(resourcePath, 'layout', `${name}.layout.ts`);
    let layoutFileContent = await fs.readFile(layoutFilePath, 'utf8');

    layoutFileContent = layoutFileContent.replace(/export const .*_FILTERS\s*=\s*\[[\s\S]*?\];\s*\n/g, '');

    const layoutDefRegex = new RegExp(`export const ${constName}_LAYOUT_DEF: DashboardLayoutDef = {([\\s\\S]*?)};`);
    const newLayoutDefString = `export const ${constName}_LAYOUT_DEF: DashboardLayoutDef = {\n    pageIdentifier: '${name}',\n    sectionTitleKey: 'page_title',\n    widgets: ${widgetsDefString}\n};`;

    if (layoutDefRegex.test(layoutFileContent)) {
        layoutFileContent = layoutFileContent.replace(layoutDefRegex, newLayoutDefString);
    } else {
        layoutFileContent += `\n${newLayoutDefString}\n`;
    }

    const importStatement = "import { PREFIX_STATS_API } from 'environments/environment';";
    const newContentWithImports = `${importStatement}\n\n${filterConstantsString}${layoutFileContent.replace(importStatement, '')}`;

    await fs.writeFile(layoutFilePath, newContentWithImports, 'utf8');
    console.log(chalk.blue(` -> Archivo de layout '${path.basename(layoutFilePath)}' actualizado.`));

    if (i18nUpdates && Object.keys(i18nUpdates).length > 0) {
        const i18nPath = path.join(resourcePath, 'i18n', `${name}.i18n.ts`);
        const i18nAST = parseFile(i18nPath);
        if (i18nAST) {
            let wordsUpdated = false;
            traverse(i18nAST, {
                ObjectProperty(path) {
                    if ((path.node.key.name || path.node.key.value) === 'words' && t.isObjectExpression(path.node.value)) {
                        wordsUpdated = true;
                        const wordsNode = path.node.value;
                        const existingKeys = new Set(
                            wordsNode.properties.map(prop => prop.key.name || prop.key.value)
                        );

                        wordsNode.properties.forEach(prop => {
                            if (t.isObjectProperty(prop)) {
                                const keyName = prop.key.name || prop.key.value;
                                if (i18nUpdates.hasOwnProperty(keyName) && prop.value.value !== i18nUpdates[keyName]) {
                                    prop.value = t.stringLiteral(String(i18nUpdates[keyName]));
                                }
                            }
                        });

                        for (const key in i18nUpdates) {
                            if (!existingKeys.has(key)) {
                                const keyNode = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
                                    ? t.identifier(key)
                                    : t.stringLiteral(key);

                                const newProperty = t.objectProperty(
                                    keyNode,
                                    t.stringLiteral(String(i18nUpdates[key]))
                                );
                                wordsNode.properties.push(newProperty);
                            }
                        }
                        path.stop();
                    }
                }
            });

            if (wordsUpdated) {
                const { code: newI18nCode } = generate(i18nAST, { jsescOption: { quotes: 'single' } });
                await fs.writeFile(i18nPath, newI18nCode, 'utf8');
                console.log(chalk.blue(` -> Archivo i18n '${path.basename(i18nPath)}' actualizado.`));
            }
        }
    }
}

app.post('/api/dev/definition/:name/dashboard-config', async (req, res) => {
    const { name } = req.params;
    const { dashboardData, i18nUpdates } = req.body;
    console.log(`\n[DEV-API] Petición para GUARDAR DASHBOARD de: ${name}`);

    try {
        await updateDashboardFile(name, dashboardData, i18nUpdates);

        const angularJsonPath = path.join(__dirname, '..', '..', '..', 'angular.json');
        fs.utimesSync(angularJsonPath, new Date(), new Date());
        console.log(`[DEV-API] Forzando reinicio del servidor de desarrollo de Angular.`);

        res.json({ success: true, message: `Configuración de dashboard para "${name}" guardada.` });
    } catch (error) {
        console.error(`[DEV-API] Error guardando el dashboard de '${name}':`, error.stack);
        res.status(500).json({ message: `No se pudo guardar la configuración de dashboard de '${name}'.`, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`[DEV-API] Escuchando en http://localhost:${port}`);
});