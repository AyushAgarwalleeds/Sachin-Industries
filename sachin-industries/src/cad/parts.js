import {clone, distance, entity, polar, rad, transform, translation, uid} from './geometry.js';

export function defineBlock(name, objects, base) {
  const label = name.trim();
  if (!label || label.length > 60) throw new Error('Use a block name between 1 and 60 characters.');
  if (!objects.length) throw new Error('Select geometry to define the block.');
  return {
    name: label,
    entities: objects.map(object => transform(object, translation([-base[0], -base[1]])))
  };
}

export function insertBlock(block, position, scale, degrees) {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Enter a positive scale.');
  const angle = rad(degrees);
  const x = scale * Math.cos(angle);
  const y = scale * Math.sin(angle);
  const matrix = [x, y, -y, x, ...position];
  const group = uid();
  return block.entities.map(object => ({...transform(object, matrix), id: uid(), group}));
}

export function boltCircle(center, pitchDiameter, holeDiameter, count, startAngle, layer = 'CUT') {
  if (!Number.isInteger(count) || count < 2 || count > 720) throw new Error('Use 2 to 720 holes.');
  if (!(pitchDiameter > 0 && holeDiameter > 0 && holeDiameter < pitchDiameter * Math.sin(Math.PI / count))) {
    throw new Error('Choose diameters that leave material between adjacent holes.');
  }
  return Array.from({length: count}, (_, index) => entity('circle', {
    center: polar(center, pitchDiameter / 2, rad(startAngle + index * 360 / count)),
    r: holeDiameter / 2
  }, layer));
}

export function resizeLine(line, length, fixedEnd) {
  if (line.type !== 'line') throw new Error('Select one straight line.');
  const start = fixedEnd === 'end' ? line.b : line.a;
  const end = fixedEnd === 'end' ? line.a : line.b;
  const previous = distance(start, end);
  if (previous < 1e-7 || !(length > 0)) throw new Error('Use a nonzero line and a positive length.');
  const result = clone(line);
  result[fixedEnd === 'end' ? 'a' : 'b'] = start.map((n, i) => n + (end[i] - n) * length / previous);
  return result;
}
