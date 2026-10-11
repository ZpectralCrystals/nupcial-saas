const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const core = require("../core.js");

test("CSV preserves quoted commas, escaped quotes and multiline values", () => {
  assert.deepEqual(core.parseCSV('\uFEFFnombre,nota\r\n"Ana, Luis","Dice ""sí""\r\nLlegamos mañana"\r\n'), [
    ["nombre", "nota"], ["Ana, Luis", 'Dice "sí"\nLlegamos mañana'],
  ]);
});

test("CSV detects semicolon without counting quoted separators", () => {
  assert.deepEqual(core.parseCSV('\n"nombre, grupo";pases\r\n"Ana; Luis";2\r\n'), [
    ["nombre, grupo", "pases"], ["Ana; Luis", "2"],
  ]);
});

test("CSV rejects malformed quoted records instead of partially importing", () => {
  for (const text of ['a,b\n"sin cerrar,2', 'a,b\n"Ana"incorrecto,2', 'a,b\nAna"Luis,2']) {
    assert.throws(() => core.parseCSV(text), /CSV/);
  }
});

test("guest import validates headers, columns and finite integer pass counts", () => {
  for (const text of [
    "foo,bar\nAna,2", "nombre_grupo,numero_pases\nAna,2,extra", "nombre_grupo,numero_pases\n,2",
    "nombre_grupo,numero_pases\nAna,Infinity", "nombre_grupo,numero_pases\nAna,2.5", "nombre_grupo,numero_pases\nAna,0",
    "nombre_grupo,numero_pases\nAna,11", "nombre_grupo,numero_pases\nAna,", "nombre_grupo,nombre_grupo,numero_pases\nAna,Ana,2",
  ]) assert.throws(() => core.parseGuestCSV(text));
});

test("guest import accepts BOM, Spanish aliases and independent deterministic IDs", () => {
  const guests = core.parseGuestCSV('\uFEFFNombre;Pases;Tipo;Categoría;Lado;Teléfono\n"Ana, Luis";2;grupo;Familia;Ambos;+51999999999\nBerta;1;individual;;;', { idStart: 100 });
  assert.equal(guests.length, 2);
  assert.equal(guests[0].id, 100);
  assert.equal(guests[1].id, 101);
  assert.equal(guests[0].name, "Ana, Luis");
  assert.equal(guests[0].phone, "+51999999999");
  assert.equal(guests[1].type, "individual");
  assert.equal(guests[0].status, "pending");
  assert.equal(guests[0].confirmedCount, 0);
});

test("CSV export escapes formulas, whitespace formulas and embedded quotes", () => {
  const cells = ['=HYPERLINK("x")', "+123", "-1", "@SUM(A1)", "  =1+1", "\t=1", "Normal", 'Ana "A"', "Dos\nlíneas"];
  const decoded = core.parseCSV(core.csvText([cells]))[0];
  assert.deepEqual(decoded.slice(0, 6), cells.slice(0, 6).map(value => "'" + value));
  assert.deepEqual(decoded.slice(6), cells.slice(6));
});

test("counts reject coercible objects, blanks, booleans, fractions and infinities", () => {
  for (const value of ["", " ", null, undefined, true, false, [], [2], {}, 1.5, Infinity, NaN, "0x2", "2e0", "2.0"]) {
    assert.throws(() => core.integerCount(value), RangeError);
  }
  assert.equal(core.integerCount(" 2 "), 2);
  assert.equal(core.integerCount(0, { min: 0 }), 0);
});

test("deadline stays open until local end of day, independent of UTC rollover", () => {
  const output = execFileSync(process.execPath, ["-e", `
    const c = require(${JSON.stringify(require.resolve("../core.js"))});
    process.stdout.write(JSON.stringify([
      c.isDeadlinePassed('2026-10-10', new Date('2026-10-11T04:59:59Z')),
      c.isDeadlinePassed('2026-10-10', new Date('2026-10-11T05:00:00Z'))
    ]));
  `], { env: { ...process.env, TZ: "America/Lima" }, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), [false, true]);
  assert.equal(core.isDeadlinePassed("", new Date()), false);
  assert.throws(() => core.isDeadlinePassed("2026-02-30"), /Fecha límite/);
  assert.equal(core.isCalendarDate("2028-02-29"), true);
  assert.equal(core.isCalendarDate("2027-02-29"), false);
});

test("attendance uses response counts without confusing named members with seats", () => {
  assert.equal(core.attendanceCount({ status: "pending", passes: 4 }), 0);
  assert.equal(core.attendanceCount({ status: "confirmed", passes: 4, members: ["Familia"] }), 4);
  assert.equal(core.attendanceCount({ status: "confirmed", passes: 4, confirmedCount: 2 }), 2);
  assert.throws(() => core.attendanceCount({ status: "confirmed", passes: 4, confirmedCount: 5 }));
});

test("floor-plan positions stay within the room and auto-layout is deterministic", () => {
  assert.deepEqual(core.clampFloorPosition(-10, 120), { x: 0, y: 74 });
  assert.deepEqual(core.floorPosition({}, 0, 2), { x: 12, y: 26 });
  const source = [{ id: 1, name: "Mesa A" }, { id: 2, name: "Mesa B" }, { id: 3, name: "Mesa C" }];
  const arranged = core.distributeFloorTables(source);
  assert.deepEqual(arranged.map(({ x, y }) => [x, y]), [[12, 14], [70, 14], [12, 60]]);
  assert.equal(source[0].x, undefined, "layout leaves the source intact");
  assert.deepEqual(core.floorPosition({ x: 99, y: 10 }, 0, 1), { x: 82, y: 10 });
});

test("legacy normalization is immutable and preserves allocated confirmed attendance", () => {
  const source = { id: 1, name: "Familia", passes: 4, status: "confirmed", members: ["Ana"], table: 2 };
  const guest = core.normalizeGuestRecord(source);
  assert.equal(guest.confirmedCount, 4);
  assert.equal(source.confirmedCount, undefined);
  assert.notEqual(guest.members, source.members);
  assert.equal(core.normalizeGuestRecord({ ...source, status: "declined" }).table, null);
});

test("backup validation rejects unrelated JSON, wrong list types and duplicate identities", () => {
  const backup = {
    event: { bride: "Ana", groom: "Luis", date: "2027-09-18", deadline: "2027-08-30" },
    guests: [{ id: 1, name: "Familia", passes: 4, status: "confirmed", table: 2 }],
    tables: [{ id: 2, name: "Jardín", seats: 8 }], songs: [], gallery: [], itinerary: [], gifts: [],
  };
  assert.equal(core.validateBackup(backup), backup);
  assert.throws(() => core.validateBackup({}));
  assert.throws(() => core.validateBackup({ ...backup, guests: "invalid" }));
  assert.throws(() => core.validateBackup({ ...backup, guests: [backup.guests[0], backup.guests[0]] }), /repetido/);
  assert.throws(() => core.validateBackup({ ...backup, tables: [] }), /inexistente/);
});

test("backup validation rejects invalid room positions and duplicate room objects", () => {
  const backup = {
    event: { bride: "Ana", groom: "Luis", date: "2027-09-18", deadline: "2027-08-30" },
    guests: [], tables: [{ id: 2, name: "Jardín", seats: 8, x: 20, y: 30 }],
    floorObjects: [{ id: 3, type: "stage", x: 42, y: 45 }], songs: [], gallery: [], itinerary: [], gifts: [],
  };
  assert.equal(core.validateBackup(backup), backup);
  assert.throws(() => core.validateBackup({ ...backup, tables: [{ ...backup.tables[0], x: 120 }] }), /posición de mesa/);
  assert.throws(() => core.validateBackup({ ...backup, floorObjects: [backup.floorObjects[0], backup.floorObjects[0]] }), /repetido/);
});
