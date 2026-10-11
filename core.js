(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NupcialCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function integerCount(value, { min = 1, max = 10, label = "Cantidad" } = {}) {
    const validType = typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()));
    const count = validType ? Number(value) : NaN;
    if (!Number.isSafeInteger(count) || count < min || count > max) {
      throw new RangeError(`${label}: debe ser un entero entre ${min} y ${max}.`);
    }
    return count;
  }

  function detectDelimiter(text) {
    let quoted = false;
    let commas = 0;
    let semicolons = 0;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"') {
        if (quoted && text[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted) {
        if (character === ",") commas += 1;
        if (character === ";") semicolons += 1;
        if ((character === "\n" || character === "\r") && (commas || semicolons)) break;
      }
    }
    return semicolons > commas ? ";" : ",";
  }

  function parseCSV(source, { delimiter } = {}) {
    if (typeof source !== "string") throw new TypeError("El contenido CSV debe ser texto.");
    const text = source.replace(/^\uFEFF/, "");
    const separator = delimiter || detectDelimiter(text);
    if (![",", ";"].includes(separator)) throw new Error("Separador CSV no válido.");
    const rows = [];
    let row = [];
    let field = "";
    let state = "start";
    let quotedField = false;
    let line = 1;
    function finishField() {
      row.push(quotedField ? field : field.trim());
      field = "";
      state = "start";
      quotedField = false;
    }
    function finishRow() {
      finishField();
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
    }
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (state === "quoted") {
        if (character === '"') {
          if (text[index + 1] === '"') { field += '"'; index += 1; }
          else state = "closed";
        } else {
          if (character === "\r") {
            if (text[index + 1] === "\n") index += 1;
            field += "\n";
            line += 1;
          } else {
            field += character;
            if (character === "\n") line += 1;
          }
        }
      } else if (character === separator) {
        finishField();
      } else if (character === "\n" || character === "\r") {
        finishRow();
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        line += 1;
      } else if (state === "closed") {
        if (!/[ \t]/.test(character)) throw new Error(`CSV, línea ${line}: carácter después de cerrar comillas.`);
      } else if (character === '"') {
        if (field.trim()) throw new Error(`CSV, línea ${line}: comillas dentro de un campo sin escapar.`);
        field = "";
        quotedField = true;
        state = "quoted";
      } else {
        field += character;
        state = "unquoted";
      }
    }
    if (state === "quoted") throw new Error(`CSV, línea ${line}: faltan comillas de cierre.`);
    finishRow();
    return rows;
  }

  function csvText(rows) {
    return rows.map(row => row.map(value => {
      let text = String(value ?? "");
      // A leading apostrophe prevents spreadsheet applications evaluating cells.
      if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
      return `"${text.replaceAll('"', '""')}"`;
    }).join(",")).join("\r\n");
  }

  function canonicalHeader(value) {
    const normalized = value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
    const aliases = { nombre: "nombre_grupo", pases: "numero_pases", tipo: "tipo_invitacion", categoria: "categoria_invitado", lado: "lado_evento" };
    return aliases[normalized] || normalized;
  }

  function parseGuestCSV(text, { idStart = 1, maxRows = 5000 } = {}) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV sin registros de invitados.");
    const headers = rows[0].map(canonicalHeader);
    if (new Set(headers).size !== headers.length || headers.some(header => !header)) throw new Error("CSV con encabezados vacíos o repetidos.");
    const missing = ["nombre_grupo", "numero_pases"].filter(header => !headers.includes(header));
    if (missing.length) throw new Error(`Faltan columnas: ${missing.join(", ")}.`);
    if (rows.length - 1 > maxRows) throw new Error(`El CSV supera ${maxRows} invitados.`);
    integerCount(idStart, { min: 1, max: Number.MAX_SAFE_INTEGER - rows.length, label: "ID inicial" });
    return rows.slice(1).map((row, index) => {
      const rowNumber = index + 2;
      if (row.length !== headers.length) throw new Error(`CSV, fila ${rowNumber}: cantidad de columnas incorrecta.`);
      const get = key => (row[headers.indexOf(key)] || "").trim();
      const name = get("nombre_grupo");
      if (!name) throw new Error(`CSV, fila ${rowNumber}: nombre obligatorio.`);
      const passes = integerCount(get("numero_pases"), { label: `CSV, fila ${rowNumber}, pases` });
      const type = get("tipo_invitacion").toLowerCase();
      if (type && !["individual", "grupo", "group"].includes(type)) throw new Error(`CSV, fila ${rowNumber}: tipo de invitación no válido.`);
      const id = Number(idStart) + index;
      return {
        id, name, passes, phone: get("telefono"), type: type === "individual" ? "individual" : "group",
        category: get("categoria_invitado") || "General", side: get("lado_evento") || "Ambos",
        members: [name], notes: "", status: "pending", confirmedCount: 0, table: null, message: "", sentCount: 0,
        code: `INV-${id.toString(36).toUpperCase()}`,
      };
    });
  }

  function isCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function isDeadlinePassed(deadline, now = new Date()) {
    if (deadline === "" || deadline == null) return false;
    if (!isCalendarDate(deadline)) throw new Error("Fecha límite no válida.");
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Fecha actual no válida.");
    const today = `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return today > deadline;
  }

  function attendanceCount(guest) {
    if (guest.status !== "confirmed") return 0;
    const passes = integerCount(guest.passes);
    if (guest.confirmedCount == null) return passes;
    return integerCount(guest.confirmedCount, { min: 0, max: passes, label: "Asistentes" });
  }

  function clampFloorPosition(x, y) {
    const finite = value => typeof value === "number" && Number.isFinite(value) ? value : 50;
    return {
      x: Math.max(0, Math.min(82, finite(x))),
      y: Math.max(0, Math.min(74, finite(y))),
    };
  }

  function floorPosition(table, index, total) {
    if (typeof table?.x === "number" && Number.isFinite(table.x) && typeof table?.y === "number" && Number.isFinite(table.y)) {
      return clampFloorPosition(table.x, table.y);
    }
    const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, total))));
    const rows = Math.max(1, Math.ceil(Math.max(1, total) / columns));
    const column = index % columns;
    const row = Math.floor(index / columns);
    return clampFloorPosition(
      columns === 1 ? 39 : 12 + column * (58 / (columns - 1)),
      rows === 1 ? 26 : 14 + row * (46 / (rows - 1)),
    );
  }

  function distributeFloorTables(tables) {
    if (!Array.isArray(tables)) throw new TypeError("Las mesas deben ser una lista.");
    const columns = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
    const rows = Math.max(1, Math.ceil(tables.length / columns));
    return tables.map((table, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const position = clampFloorPosition(
        columns === 1 ? 39 : 12 + column * (58 / (columns - 1)),
        rows === 1 ? 26 : 14 + row * (46 / (rows - 1)),
      );
      return { ...table, ...position };
    });
  }

  function normalizeGuestRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Registro de invitado no válido.");
    const id = integerCount(record.id, { max: Number.MAX_SAFE_INTEGER, label: "ID de invitado" });
    if (typeof record.name !== "string" || !record.name.trim()) throw new Error("El invitado necesita nombre.");
    const passes = integerCount(record.passes, { label: "Pases" });
    const status = record.status || "pending";
    if (!["confirmed", "pending", "declined"].includes(status)) throw new Error("Estado de invitado no válido.");
    if (record.members != null && (!Array.isArray(record.members) || record.members.some(name => typeof name !== "string"))) throw new Error("Lista de acompañantes no válida.");
    const name = record.name.trim();
    const members = (record.members || [name]).map(member => member.trim()).filter(Boolean);
    if (members.length > passes) throw new Error(`El grupo ${name} tiene más personas que pases.`);
    const normalized = {
      ...record, id, name, passes, status, members,
      type: record.type === "individual" ? "individual" : "group",
      category: String(record.category || record.side || "General"), side: String(record.side || "Ambos"),
      notes: String(record.notes || ""), message: String(record.message || ""), phone: String(record.phone || ""),
      sentCount: integerCount(record.sentCount ?? 0, { min: 0, max: Number.MAX_SAFE_INTEGER, label: "Envíos" }),
      code: typeof record.code === "string" && record.code.trim() ? record.code.trim() : `INV-${id.toString(36).toUpperCase()}`,
      table: status === "confirmed" && record.table != null ? integerCount(record.table, { max: Number.MAX_SAFE_INTEGER, label: "ID de mesa" }) : null,
    };
    normalized.confirmedCount = attendanceCount(normalized);
    return normalized;
  }

  function validateBackup(data) {
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
    if (!object(data) || !object(data.event)) throw new Error("El archivo no contiene un respaldo de Nupcial.");
    for (const field of ["guests", "tables", "songs", "gallery", "itinerary", "gifts"]) {
      if (!Array.isArray(data[field]) || data[field].some(record => !object(record))) throw new Error(`Respaldo: ${field} debe ser una lista de registros.`);
    }
    if (typeof data.event.bride !== "string" || typeof data.event.groom !== "string" || !isCalendarDate(data.event.date)) throw new Error("Respaldo: datos del evento no válidos.");
    if (data.event.deadline && !isCalendarDate(data.event.deadline)) throw new Error("Respaldo: fecha límite no válida.");
    const guests = data.guests.map(normalizeGuestRecord);
    if (new Set(guests.map(guest => guest.id)).size !== guests.length || new Set(guests.map(guest => guest.code)).size !== guests.length) throw new Error("Respaldo: invitados con ID o código repetido.");
    const tableIds = new Set();
    data.tables.forEach(table => {
      integerCount(table.id, { max: Number.MAX_SAFE_INTEGER, label: "ID de mesa" });
      integerCount(table.seats, { max: 1000, label: "Capacidad de mesa" });
      if (typeof table.name !== "string" || !table.name.trim() || tableIds.has(table.id)) throw new Error("Respaldo: mesa no válida o repetida.");
      if ((table.x != null || table.y != null) && (typeof table.x !== "number" || !Number.isFinite(table.x) || typeof table.y !== "number" || !Number.isFinite(table.y) || table.x < 0 || table.x > 82 || table.y < 0 || table.y > 74)) throw new Error("Respaldo: posición de mesa no válida.");
      tableIds.add(table.id);
    });
    if (data.floorObjects != null) {
      if (!Array.isArray(data.floorObjects) || data.floorObjects.some(item => !object(item))) throw new Error("Respaldo: elementos del salón no válidos.");
      const objectIds = new Set();
      data.floorObjects.forEach(item => {
        integerCount(item.id, { max: Number.MAX_SAFE_INTEGER, label: "ID de elemento" });
        if (typeof item.type !== "string" || !item.type.trim() || objectIds.has(item.id)) throw new Error("Respaldo: elemento del salón no válido o repetido.");
        if ((item.x != null || item.y != null) && (typeof item.x !== "number" || !Number.isFinite(item.x) || typeof item.y !== "number" || !Number.isFinite(item.y) || item.x < 0 || item.x > 82 || item.y < 0 || item.y > 74)) throw new Error("Respaldo: posición de elemento no válida.");
        objectIds.add(item.id);
      });
    }
    for (const guest of guests) {
      if (guest.table != null && !tableIds.has(guest.table)) throw new Error("Respaldo: un invitado tiene una mesa inexistente.");
    }
    for (const song of data.songs) {
      if (typeof song.title !== "string" || typeof song.artist !== "string" || typeof song.requester !== "string") throw new Error("Respaldo: canción no válida.");
    }
    for (const photo of data.gallery) {
      if (typeof photo.src !== "string" || typeof photo.by !== "string") throw new Error("Respaldo: foto no válida.");
    }
    return data;
  }

  return Object.freeze({ parseCSV, parseGuestCSV, csvText, integerCount, isCalendarDate, isDeadlinePassed, attendanceCount, clampFloorPosition, floorPosition, distributeFloorTables, normalizeGuestRecord, validateBackup });
});
