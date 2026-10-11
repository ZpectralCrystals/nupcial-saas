// Generate portable artifacts from the editable source; no browser or network needed.
const fs = require('node:fs');
const path = require('node:path');
const {SYSTEM_DIAGRAMS, svgFor, mermaidFor} = require('./system-map.js');
const destination = path.join(__dirname, 'diagrams');
fs.mkdirSync(destination, {recursive:true});
for (const diagram of SYSTEM_DIAGRAMS) {
  fs.writeFileSync(path.join(destination, `${diagram.id}.svg`), svgFor(diagram));
  fs.writeFileSync(path.join(destination, `${diagram.id}.mmd`), mermaidFor(diagram));
}
console.log(`Exportados ${SYSTEM_DIAGRAMS.length} diagramas SVG y ${SYSTEM_DIAGRAMS.length} fuentes Mermaid a ${destination}`);
