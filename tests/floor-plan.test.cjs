const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { deflateRawSync } = require('node:zlib');
const Core = require('../core.js');

class XmlNode {
  constructor(name, attributes = {}) { this.name = name; this.localName = name.split(':').pop(); this.attributes = Object.entries(attributes).map(([key, value]) => ({ name: key, localName: key.split(':').pop(), value })); this.children = []; this.text = ''; }
  getAttribute(name) { return this.attributes.find(attribute => attribute.name === name)?.value ?? null; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  getElementsByTagNameNS(_namespace, localName) { const result = []; for (const child of this.children) { if (child.localName === localName) result.push(child); result.push(...child.getElementsByTagNameNS(_namespace, localName)); } return result; }
  querySelector(selector) { return selector === 'parsererror' ? null : undefined; }
}

class TestDOMParser {
  parseFromString(source) {
    const root = new XmlNode('#document'); const stack = [root];
    for (const token of source.match(/<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('<?') || token.startsWith('<!')) continue;
      if (token.startsWith('</')) { stack.pop(); continue; }
      if (!token.startsWith('<')) { stack[stack.length - 1].text += token.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); continue; }
      const selfClosing = token.endsWith('/>'); const contents = token.slice(1, selfClosing ? -2 : -1).trim(); const name = contents.match(/^[^\s/]+/)[0]; const attrs = {};
      for (const match of contents.slice(name.length).matchAll(/([^\s=]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
      const node = new XmlNode(name, attrs); stack[stack.length - 1].children.push(node); if (!selfClosing) stack.push(node);
    }
    return root;
  }
}

function zipDeflated(files) {
  let offset = 0; const localParts = []; const centralParts = [];
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
  for (const [filename, contents] of files) {
    const name = Buffer.from(filename); const plain = Buffer.from(contents); const packed = deflateRawSync(plain); const checksum = crc(plain);
    const local = Buffer.alloc(30 + name.length); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(plain.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30); localParts.push(local, packed);
    const central = Buffer.alloc(46 + name.length); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(plain.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42); name.copy(central, 46); centralParts.push(central); offset += local.length + packed.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function appHarness() {
  const listeners = new Map();
  const storage = new Map();
  const elements = new Map();
  const appRoot = { innerHTML: '' };
  const document = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    querySelector(selector) { return selector === '#app' ? appRoot : elements.get(selector) || null; },
    documentElement: { style: { setProperty() {} } },
    body: { classList: { add() {}, remove() {} } },
  };
  const window = { NupcialCore: Core, addEventListener() {}, removeEventListener() {}, print() {} };
  const context = vm.createContext({
    window, document, location: { hash: '#/tables', origin: 'http://127.0.0.1:4173', pathname: '/' },
    localStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } },
    sessionStorage: { getItem(key) { return storage.get(key) ?? (key === 'nupcial-auth' ? '1' : null); }, setItem(key, value) { storage.set(key, value); }, removeItem(key) { storage.delete(key); } },
    structuredClone, URLSearchParams, Intl, Date, Math, JSON, Blob, URL, TextEncoder, TextDecoder, DataView, Uint8Array, Response, DecompressionStream, DOMParser: TestDOMParser, setTimeout, clearTimeout,
    requestAnimationFrame(callback) { callback(); }, confirm() { return true; },
    FormData: class {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), context, { filename: 'app.js' });
  vm.runInContext('render()', context);
  return { context, appRoot, storage, elements, evaluate: code => vm.runInContext(code, context) };
}

test('seating canvas renders saved positions, capacity and draggable room elements', () => {
  const h = appHarness();
  const html = h.appRoot.innerHTML;
  assert.match(html, /class="floor-canvas"/);
  assert.match(html, /data-floor-drag="table"/);
  assert.match(html, /style="left:12%;top:26%"/);
  assert.match(html, /Imprimir plano/);
  assert.match(html, /data-add-floor-object="stage"/);
  assert.match(html, /4 lugares libres|6 lugares libres/);
  assert.match(html, /data-floor-seat="1"/);
  assert.match(html, /data-select-floor-guest="1"/);
});

test('seating workspace exposes map, table and guest views with review and assignment controls', () => {
  const h = appHarness();
  const html = h.appRoot.innerHTML;
  for (const marker of ['data-floor-view="plan"','data-floor-view="tables"','data-floor-view="guests"','id="floor-guest-search"','data-floor-action="review"','data-floor-action="minimap"','data-drag-guest=']) assert.ok(html.includes(marker), marker);
  h.evaluate('floorSelectedTables=new Set([db.tables[0].id]);');
  assert.match(h.evaluate('tablesPage()'), /id="floor-edit-form"/);
  h.evaluate('db.guests.find(g=>g.id===2).table=null;floorView="guests";floorUnassignedOnly=true;floorSearch="Lucía"');
  const guestsView = h.evaluate('tablesPage()');
  assert.match(guestsView, /Distribuir automáticamente/);
  assert.match(guestsView, /Solo sin asignar/);
  assert.match(guestsView, /data-assign-table=/);
});

test('auto seating packs confirmed groups without exceeding capacity or assigning pending guests', () => {
  const h = appHarness();
  h.evaluate(`db.tables=[{id:11,name:'Mesa A',seats:4,shape:'round',x:20,y:20},{id:12,name:'Mesa B',seats:3,shape:'rect',x:70,y:20}];db.floorObjects=[];db.guests=[{id:21,name:'Familia Grande',passes:3,confirmedCount:3,status:'confirmed',table:null,members:['Ana','Luis','Eva']},{id:22,name:'Pareja',passes:2,confirmedCount:2,status:'confirmed',table:null,members:['Paz','Leo']},{id:23,name:'Invitado',passes:1,confirmedCount:1,status:'confirmed',table:null,members:['Sol']},{id:24,name:'Pendiente',passes:2,status:'pending',table:null,members:[]}];autoAssignTables()`);
  assert.equal(h.evaluate('db.guests.filter(g=>g.status==="confirmed"&&!g.table).length'),0);
  assert.equal(h.evaluate('db.guests.find(g=>g.id===24).table'),null);
  assert.ok(h.evaluate('db.tables.every(t=>floorTableUsage(t.id)<=t.seats)'));
});

test('click-seat assignment places the whole confirmed group and rejects capacity overflow', () => {
  const h=appHarness();
  h.evaluate('assignFloorGuest(2,1);assignFloorGuest(5,1);');
  assert.equal(h.evaluate('db.guests.find(g=>g.id===1).table'),1);
  assert.equal(h.evaluate('floorTableUsage(1)'),8);
  h.evaluate('db.guests.push({id:77,name:"Grupo pequeño",passes:1,confirmedCount:1,status:"confirmed",table:null,members:["Persona"]})');
  assert.throws(()=>h.evaluate('assignFloorGuest(77,1)'),/Mesa sin capacidad/);
  assert.equal(h.evaluate('db.guests.find(g=>g.id===77).table'),null);
  assert.throws(()=>h.evaluate('assignFloorGuest(3,1)'),/Solo puedes sentar/);
});

test('mock checkout presents a clearly fake purchase with safe outcome controls and no card input', () => {
  const h=appHarness();
  const html=h.evaluate('checkoutPage()');
  assert.match(html,/SIMULADOR DE COMPRA · SIN COBRO/);
  assert.match(html,/id="checkout-summary"/);
  assert.match(html,/No ingreses datos bancarios ni de tarjeta/);
  const actions=h.evaluate('refreshCheckoutPage');
  assert.equal(typeof actions,'function');
  assert.doesNotMatch(html,/<input[^>]*(?:card|cvv|tarjeta)/i);
});

test('room-object placement, table layout and undo persist only local layout state', () => {
  const h = appHarness();
  h.evaluate("addFloorObject('stage')");
  assert.equal(h.evaluate('db.floorObjects.length'), 1);
  assert.equal(h.evaluate('db.floorObjects[0].type'), 'stage');
  h.evaluate('db.tables[0].x = 5; db.tables[0].y = 5');
  const before = h.evaluate('JSON.stringify(db.tables.map(({id,x,y}) => ({id,x,y})))');
  h.evaluate('arrangeFloorTables()');
  assert.notEqual(h.evaluate('JSON.stringify(db.tables.map(({id,x,y}) => ({id,x,y})))'), before);
  h.evaluate('undoFloorPlan()');
  assert.equal(h.evaluate('JSON.stringify(db.tables.map(({id,x,y}) => ({id,x,y})))'), before);
  assert.ok(h.storage.get('nupcial-demo-v1').includes('"floorObjects"'));
});

test('floor zoom stays within supported bounds', () => {
  const h = appHarness();
  h.evaluate('setFloorZoom(2)');
  assert.equal(h.evaluate('floorZoom'), 1.4);
  h.evaluate('setFloorZoom(0.1)');
  assert.equal(h.evaluate('floorZoom'), 0.35);
});

test('moving a multiselected table group preserves offsets and clamps room bounds', () => {
  const h = appHarness();
  h.evaluate(`db.tables=[{id:11,name:'Mesa A',seats:4,shape:'round',x:20,y:30},{id:12,name:'Mesa B',seats:4,shape:'rect',x:35,y:45}];moveFloorItems('table',[{id:11,x:20,y:30},{id:12,x:35,y:45}],10,-5)`);
  assert.deepEqual(JSON.parse(h.evaluate('JSON.stringify(db.tables.map(({x,y})=>({x,y})))')), [{x:30,y:25},{x:45,y:40}]);
  h.evaluate(`moveFloorItems('table',[{id:11,x:30,y:25},{id:12,x:45,y:40}],100,100)`);
  assert.ok(h.evaluate('db.tables.every(table=>table.x<=82&&table.y<=74)'));
});

test('gallery ZIP writes valid uncompressed entries with CRC32 metadata', () => {
  const h = appHarness();
  const zip = Buffer.from(JSON.parse(h.evaluate("JSON.stringify(Array.from(zipStoredFiles([{name:'foto-001.txt',bytes:new Uint8Array([72,105])}])))")));
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'local file header');
  assert.equal(zip.readUInt32LE(14), 0x4d170e0e, 'CRC32 of Hi');
  assert.equal(zip.readUInt32LE(18), 2, 'stored byte length');
  assert.equal(zip.subarray(30 + 'foto-001.txt'.length, 30 + 'foto-001.txt'.length + 2).toString(), 'Hi');
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, 'end of central directory');
});

test('gallery photos decode base64 and percent-encoded seed images', () => {
  const h = appHarness();
  assert.equal(h.evaluate("JSON.stringify(Array.from(photoBytes('data:text/plain;base64,SGVsbG8=').bytes))"), '[72,101,108,108,111]');
  assert.equal(h.evaluate("photoBytes('data:image/svg+xml,%3Csvg%3E%3C/svg%3E').mime"), 'image/svg+xml');
});

test('XLSX import ZIP reader locates workbook XML and spreadsheet columns', () => {
  const h = appHarness();
  const payload = JSON.parse(h.evaluate("JSON.stringify(Array.from(zipEntryRecord(zipStoredFiles([{name:'xl/workbook.xml',bytes:new TextEncoder().encode('<workbook/>')}]),'xl/workbook.xml').compressed))"));
  assert.equal(Buffer.from(payload).toString(), '<workbook/>');
  assert.equal(h.evaluate('xlsxColumnIndex("A1")'), 0);
  assert.equal(h.evaluate('xlsxColumnIndex("Z5")'), 25);
  assert.equal(h.evaluate('xlsxColumnIndex("AA12")'), 26);
  assert.equal(h.evaluate('zipEntryRecord(zipStoredFiles([]),"xl/nope.xml")'), null);
  h.evaluate('modal={type:"import"}');
  assert.match(h.evaluate('renderModal()'), /\.xlsx/);
});

test('XLSX importer reads a deflated first sheet with shared strings', async () => {
  const h = appHarness();
  const entries = [
    ['xl/workbook.xml', '<workbook xmlns:r="urn:relationships"><sheets><sheet name="Invitados" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/sharedStrings.xml', '<sst><si><t>nombre_grupo</t></si><si><t>numero_pases</t></si><si><t>Familia Demo</t></si></sst>'],
    ['xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>3</v></c></row></sheetData></worksheet>'],
  ];
  const zip = JSON.stringify([...zipDeflated(entries)]);
  const csv = await h.evaluate(`(async()=>{const bytes=Uint8Array.from(${zip});const file={arrayBuffer:async()=>bytes.buffer};return await parseXlsxGuestCSV(file)})()`);
  const guests = Core.parseGuestCSV(csv);
  assert.equal(guests.length, 1);
  assert.equal(guests[0].name, 'Familia Demo');
  assert.equal(guests[0].passes, 3);
});

test('RSVP module exposes filters, status sections and event-type responses', () => {
  const h = appHarness();
  const rsvp = h.evaluate('rsvpPage()');
  const invitation = h.evaluate('publicPage()');
  assert.match(rsvp, /rsvp-search/);
  assert.match(rsvp, /rsvp-type-filter/);
  assert.match(rsvp, /rsvp-pending-list/);
  assert.match(rsvp, /export-rsvp-confirmed/);
  assert.match(invitation, /name="attendanceType"/);
});

test('guest list exposes copy-message, copy-link and open-personal-invitation actions', () => {
  const h = appHarness();
  const html = h.evaluate('guestRows([db.guests[0]])');
  assert.match(html, /data-copy-invite="1"/);
  assert.match(html, /data-copy-link="1"/);
  assert.match(html, /href="#\/public\?guest=INV-1"/);
  assert.equal(h.evaluate('personalizedInviteUrl(db.guests[0])'), 'http://127.0.0.1:4173/#/public?guest=INV-1');
  assert.ok(h.evaluate('invitationMessage(db.guests[0])').includes('http://127.0.0.1:4173/#/public?guest=INV-1'));
});

test('module navigation closes an open modal', () => {
  const h = appHarness();
  h.evaluate('modal={type:"import"};go("tables")');
  assert.equal(h.evaluate('modal'), null);
});

test('authenticated owner cannot re-enter new-customer onboarding and overwrite event', () => {
  const h = appHarness();
  h.context.location.hash = '#/start?tema=terra&paleta=terracota&plan=deluxe';
  h.evaluate('render()');
  assert.equal(h.context.location.hash, '#/dashboard');
  h.evaluate('render()');
  assert.match(h.appRoot.innerHTML, /Bienvenidos/);
});

test('new-customer login on occupied install returns to existing event without PUT', async () => {
  const h = appHarness();
  await new Promise(resolve => setTimeout(resolve, 10));
  h.evaluate('db.event.bride="EXISTING_BRIDE"');
  const form = { data: { email: 'demo@boda.local', password: 'demo123' }, addEventListener(name, handler) { this.handler = handler; } };
  const loginError = { textContent: '' };
  const toast = { textContent: '', classList: { add() {}, remove() {} } };
  h.elements.set('#login-form', form);
  h.elements.set('#login-error', loginError);
  h.elements.set('#toast', toast);
  const requests = [];
  h.context.fetch = async (url, options = {}) => {
    requests.push({ url, method: options.method || 'GET' });
    const body = url === '/api/state'
      ? { state: h.evaluate('structuredClone(db)'), version: 7 }
      : url === '/api/auth/login'
        ? { authenticated: true, legacy: true, email: 'demo@boda.local' }
        : url === '/api/auth/session'
          ? { authenticated: true, legacy: true, email: 'demo@boda.local' }
        : { authenticated: true };
    return { ok: true, status: 200, json: async () => body };
  };
  h.context.FormData = class { constructor(target) { this.data = target.data; } get(key) { return this.data[key]; } };
  h.evaluate('apiMode=true;location.hash="#/login";sessionStorage.setItem("nupcial-pending-setup",JSON.stringify({bride:"NEW_BRIDE",groom:"NEW_GROOM",theme:"terra",palette:"terracota",plan:"deluxe"}));bindPage("login")');
  await form.handler({ preventDefault() {}, currentTarget: form });
  assert.equal(loginError.textContent, '');
  assert.deepEqual(requests.map(item => item.url), ['/api/auth/login', '/api/state']);
  assert.equal(h.evaluate('db.event.bride'), 'EXISTING_BRIDE');
  assert.equal(h.storage.has('nupcial-pending-setup'), false);
  assert.equal(h.storage.get('nupcial-auth'), '1');
  assert.equal(h.context.location.hash, '#/dashboard');
  assert.match(toast.textContent, /conserva su evento/i);
});
