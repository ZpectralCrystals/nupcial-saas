const test=require('node:test');
const assert=require('node:assert/strict');
const {SYSTEM_DIAGRAMS,MAP_PALETTES,svgFor,mermaidFor}=require('../docs/system-map.js');

test('seventeen system diagrams have valid nodes, connections and canvas bounds',()=>{
  assert.equal(SYSTEM_DIAGRAMS.length,17);
  assert.equal(new Set(SYSTEM_DIAGRAMS.map(d=>d.id)).size,17);
  for(const diagram of SYSTEM_DIAGRAMS){
    const ids=new Set(diagram.nodes.map(n=>n.id));
    assert.equal(ids.size,diagram.nodes.length);
    for(const node of diagram.nodes){
      assert.ok(node.x>=0&&node.y>=0&&node.x+node.w<=1200&&node.y+node.h<=diagram.height,`${diagram.id}/${node.id}: within canvas`);
      assert.ok(diagram.edges.some(e=>e.from===node.id||e.to===node.id),`${diagram.id}/${node.id}: connected`);
    }
    for(const edge of diagram.edges){assert.ok(ids.has(edge.from));assert.ok(ids.has(edge.to));}
    assert.match(svgFor(diagram),/^<svg/);assert.match(svgFor(diagram),/<title/);
    assert.match(mermaidFor(diagram),/^flowchart LR/);
    assert.doesNotMatch(mermaidFor(diagram),/<br|undefined|NaN/);
  }
});
test('account lifecycle map documents implemented tenant isolation and production gaps',()=>{
  const accounts=SYSTEM_DIAGRAMS.find(d=>d.id==='saas-accounts');
  assert.ok(accounts);
  assert.ok(accounts.edges.some(edge=>edge.from==='account'&&edge.to==='newEvent'&&edge.label==='1:N'));
  assert.match(mermaidFor(accounts),/Login cuenta/);
  assert.match(accounts.notes.flat().join(' '),/payload JSONB versionado/);
  assert.match(accounts.notes.flat().join(' '),/Tenant A no puede/);
  assert.ok(accounts.nodes.filter(node=>['signup','permission','repo','projection','tests'].includes(node.id)).every(node=>node.type!=='pending'));
  assert.ok(accounts.nodes.filter(node=>['migration','ops'].includes(node.id)).every(node=>node.type==='pending'));
});
test('palette map describes nine distinct four-token palettes',()=>{
  assert.equal(MAP_PALETTES.length,9);assert.equal(new Set(MAP_PALETTES.map(p=>p[0])).size,9);
  for(const p of MAP_PALETTES){assert.equal(p.length,6);p.slice(2).forEach(color=>assert.match(color,/^#[a-f0-9]{6}$/i));}
});
test('deployment architecture separates demo-ready components from production gaps',()=>{
  const production=SYSTEM_DIAGRAMS.find(d=>d.id==='production');
  assert.ok(production.nodes.some(n=>n.type==='local'));
  assert.ok(production.nodes.some(n=>n.type==='pending'));
  assert.match(mermaidFor(production),/PENDIENTE/);
  assert.match(production.notes.flat().join(' '),/almacenamiento de objetos/);
  assert.match(production.notes.flat().join(' '),/servicio aparte/);
});
test('cardinality diagram distinguishes active tenant ownership from JSONB collections',()=>{
  const data=SYSTEM_DIAGRAMS.find(d=>d.id==='data-relations');
  assert.ok(data);
  assert.ok(data.edges.some(e=>e.from==='event'&&e.to==='guests'&&e.label.includes('1:N')));
  assert.ok(data.edges.some(e=>e.from==='accounts'&&e.to==='tenantEvents'&&e.label.includes('activa')));
  assert.match(data.notes.flat().join(' '),/Una cuenta posee muchos eventos/);
  assert.match(data.notes.flat().join(' '),/no son repositorios relacionales activos/);
});
test('checkout flow keeps mock local and delegates billing outside the app',()=>{
  const payment=SYSTEM_DIAGRAMS.find(d=>d.id==='payments');
  assert.ok(payment);
  assert.match(payment.notes.flat().join(' '),/Sin formulario de tarjeta/);
  assert.match(payment.notes.flat().join(' '),/billing aparte/);
  assert.match(mermaidFor(payment),/Entitlement firmado/);
});
test('eight client detail diagrams distinguish observed UI from unverified behavior',()=>{
  const client=SYSTEM_DIAGRAMS.filter(d=>d.id.startsWith('client-'));
  assert.equal(client.length,8);
  assert.deepEqual(client.map(d=>d.id),['client-access','client-guests','client-confirmations','client-seating','client-editor','client-songs','client-gallery','client-upgrades']);
  for(const diagram of client){
    assert.ok(diagram.nodes.some(n=>n.type==='observed'),`${diagram.id}: observed UI evidence`);
    assert.ok(diagram.nodes.some(n=>n.type==='pending'),`${diagram.id}: unverified boundary`);
  }
  assert.match(mermaidFor(SYSTEM_DIAGRAMS.find(d=>d.id==='client-access')),/UI OBSERVADA/);
});
test('client diagrams document implemented local iterations and production boundaries',()=>{
  const byId=Object.fromEntries(SYSTEM_DIAGRAMS.map(d=>[d.id,d]));
  assert.match(byId['client-guests'].notes.flat().join(' '),/páginas de 10\/25\/50/);
  assert.match(byId['client-confirmations'].notes.flat().join(' '),/exportación CSV/);
  assert.match(byId['client-songs'].notes.flat().join(' '),/aprobar, rechazar y eliminar/);
  assert.match(byId['client-gallery'].notes.flat().join(' '),/seleccionar fotos individuales\/todas/);
});
