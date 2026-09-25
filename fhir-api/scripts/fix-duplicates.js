#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Función para limpiar variables duplicadas en un archivo
function fixDuplicates(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const fixedLines = [];
        const seenVariables = new Set();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Buscar declaraciones de variables
            const varMatch = line.match(/^let (\w+) = args\[/);
            if (varMatch) {
                const varName = varMatch[1];
                if (seenVariables.has(varName)) {
                    // Saltar líneas duplicadas
                    continue;
                } else {
                    seenVariables.add(varName);
                    fixedLines.push(lines[i]);
                }
            } else {
                fixedLines.push(lines[i]);
            }
        }

        const fixedContent = fixedLines.join('\n');
        fs.writeFileSync(filePath, fixedContent);
        return true;
    } catch (error) {
        console.error(`Error fixing duplicates in ${filePath}:`, error.message);
        return false;
    }
}

// Función para procesar todos los servicios
function fixAllServices() {
    console.log('🔧 Iniciando limpieza de variables duplicadas...\n');

    const servicesDir = path.join(__dirname, '..', 'src', 'services');
    const services = fs.readdirSync(servicesDir);

    let fixedCount = 0;
    let errorCount = 0;

    for (const service of services) {
        const servicePath = path.join(servicesDir, service, `${service}.service.js`);

        if (fs.existsSync(servicePath)) {
            if (fixDuplicates(servicePath)) {
                console.log(`✅ Limpiado servicio ${service}`);
                fixedCount++;
            } else {
                console.log(`❌ Error limpiando servicio ${service}`);
                errorCount++;
            }
        }
    }

    console.log(`\n🎉 Limpieza completada!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Servicios limpiados: ${fixedCount}`);
    console.log(`   - Errores: ${errorCount}`);
}

// Ejecutar el script
if (require.main === module) {
    fixAllServices();
}

module.exports = { fixDuplicates, fixAllServices }; 