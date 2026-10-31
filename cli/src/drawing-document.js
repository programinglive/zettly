const editableFields = new Set(['x', 'y', 'rotation', 'opacity', 'isLocked', 'index', 'props', 'meta']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getDrawingDocument(value) {
  const drawing = value?.drawing ?? value;
  const snapshot = drawing?.document;
  const document = snapshot?.document && isObject(snapshot.document.store) ? snapshot.document : snapshot;
  if (!isObject(snapshot) || !isObject(document) || !isObject(document.store)) {
    throw new Error('Drawing has no editable TLDraw document store. Export it and inspect the JSON format.');
  }
  return { drawing, snapshot, document };
}

function withStore(drawing, snapshot, document, store) {
  const root = { ...document, store };
  return {
    ...drawing,
    document: snapshot === document ? root : { ...snapshot, document: root },
  };
}

function resolveShapeKey(store, shapeId) {
  const key = store[shapeId] ? shapeId : shapeId.startsWith('shape:') ? shapeId : `shape:${shapeId}`;
  return store[key]?.typeName === 'shape' ? key : null;
}

export function listShapes(value) {
  const { document } = getDrawingDocument(value);
  return Object.values(document.store).filter((record) => record?.typeName === 'shape');
}

export function updateShape(value, shapeId, patch) {
  if (!isObject(patch) || Object.keys(patch).length === 0) {
    throw new Error('Provide a non-empty JSON object with shape fields to update.');
  }
  const invalid = Object.keys(patch).filter((key) => !editableFields.has(key));
  if (invalid.length) throw new Error(`Shape identity and structure fields are immutable: ${invalid.join(', ')}.`);
  if (patch.props !== undefined && !isObject(patch.props)) throw new Error('The props patch must be a JSON object.');
  if (patch.meta !== undefined && !isObject(patch.meta)) throw new Error('The meta patch must be a JSON object.');

  for (const key of ['x', 'y', 'rotation', 'opacity']) {
    if (patch[key] !== undefined && (typeof patch[key] !== 'number' || !Number.isFinite(patch[key]))) {
      throw new Error(`${key} must be a finite number.`);
    }
  }
  if (patch.opacity !== undefined && (patch.opacity < 0 || patch.opacity > 1)) {
    throw new Error('opacity must be between 0 and 1.');
  }
  if (patch.props) {
    for (const key of ['w', 'h']) {
      if (patch.props[key] !== undefined && (typeof patch.props[key] !== 'number' || patch.props[key] <= 0)) {
        throw new Error(`${key} must be a positive number.`);
      }
    }
  }

  const { drawing, snapshot, document } = getDrawingDocument(value);
  const key = resolveShapeKey(document.store, shapeId);
  if (!key) throw new Error(`Shape not found: ${shapeId}.`);
  const current = document.store[key];
  const nextShape = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([field]) => !['props', 'meta'].includes(field))),
    ...(patch.props ? { props: { ...current.props, ...patch.props } } : {}),
    ...(patch.meta ? { meta: { ...current.meta, ...patch.meta } } : {}),
  };
  return withStore(drawing, snapshot, document, { ...document.store, [key]: nextShape });
}

export function addShape(value, shape) {
  if (!isObject(shape) || typeof shape.id !== 'string' || !shape.id.startsWith('shape:')
    || shape.typeName !== 'shape' || typeof shape.type !== 'string' || !isObject(shape.props)
    || typeof shape.parentId !== 'string' || typeof shape.index !== 'string') {
    throw new Error('Provide a valid TLDraw shape record with id, type, parentId, index, and props.');
  }
  const { drawing, snapshot, document } = getDrawingDocument(value);
  if (document.store[shape.id]) throw new Error(`Shape already exists: ${shape.id}.`);
  if (!document.store[shape.parentId]) throw new Error(`Shape parent not found: ${shape.parentId}.`);
  return withStore(drawing, snapshot, document, { ...document.store, [shape.id]: shape });
}

export function deleteShape(value, shapeId) {
  const { drawing, snapshot, document } = getDrawingDocument(value);
  const key = resolveShapeKey(document.store, shapeId);
  if (!key) throw new Error(`Shape not found: ${shapeId}.`);
  const children = Object.values(document.store).filter((record) => record?.parentId === key);
  if (children.length) throw new Error(`Shape has ${children.length} child record(s); delete or move them first.`);
  const store = { ...document.store };
  delete store[key];
  return withStore(drawing, snapshot, document, store);
}
