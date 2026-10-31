import test from 'node:test';
import assert from 'node:assert/strict';
import { addShape, deleteShape, listShapes, updateShape } from '../src/drawing-document.js';

const shape = (id, overrides = {}) => ({
  id: `shape:${id}`,
  typeName: 'shape',
  type: 'geo',
  x: 10,
  y: 20,
  rotation: 0,
  index: 'a1',
  parentId: 'page:page1',
  isLocked: false,
  opacity: 1,
  props: { w: 100, h: 80, color: 'black' },
  meta: {},
  ...overrides,
});

const document = () => ({ document: { document: { name: 'Sketch', store: {
  'document:document': { id: 'document:document', typeName: 'document' },
  'page:page1': { id: 'page:page1', typeName: 'page' },
  'shape:one': shape('one'),
} } } });

test('lists only TLDraw shape records', () => {
  assert.deepEqual(listShapes(document()).map((item) => item.id), ['shape:one']);
});

test('updates editable shape fields and merges shape props', () => {
  const result = updateShape(document(), 'shape:one', { x: 40, props: { w: 160 } });
  assert.equal(result.document.document.store['shape:one'].x, 40);
  assert.deepEqual(result.document.document.store['shape:one'].props, { w: 160, h: 80, color: 'black' });
  assert.equal(document().document.document.store['shape:one'].x, 10);
});

test('rejects identity changes and invalid dimensions', () => {
  assert.throws(() => updateShape(document(), 'shape:one', { id: 'shape:other' }), /immutable/);
  assert.throws(() => updateShape(document(), 'shape:one', { props: { w: -1 } }), /positive/);
});

test('adds a full TLDraw shape record without replacing existing records', () => {
  const result = addShape(document(), shape('two'));
  assert.equal(result.document.document.store['shape:two'].id, 'shape:two');
  assert.equal(result.document.document.store['shape:one'].id, 'shape:one');
});

test('rejects duplicate or malformed shapes', () => {
  assert.throws(() => addShape(document(), shape('one')), /already exists/);
  assert.throws(() => addShape(document(), { id: 'shape:bad' }), /valid TLDraw shape/);
});

test('deletes a shape while preserving the rest of the drawing', () => {
  const result = deleteShape(document(), 'shape:one');
  assert.equal(result.document.document.store['shape:one'], undefined);
  assert.ok(result.document.document.store['page:page1']);
});
