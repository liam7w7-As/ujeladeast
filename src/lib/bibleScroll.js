export function referenceNumbers(reference) {
  return reference.split('+').map(part => Number(part.split('.').at(-1))).filter(number => Number.isInteger(number) && number > 0);
}

// A grouped translation spans several verse numbers; interpolate within that group.
export function readingPosition(anchors, scrollTop) {
  if (!anchors.length) return null;
  if (scrollTop <= anchors[0].top) return { verse: anchors[0].numbers[0], fraction: 0, intro: anchors[0].top > 0 ? Math.max(0, scrollTop) / anchors[0].top : 0 };
  let anchor = anchors[0];
  for (const candidate of anchors) {
    if (candidate.top > scrollTop + 0.5) break;
    anchor = candidate;
  }
  const progress = Math.max(0, Math.min(0.9999, (scrollTop - anchor.top) / Math.max(1, anchor.end - anchor.top)));
  const withinGroup = progress * anchor.numbers.length;
  const index = Math.min(anchor.numbers.length - 1, Math.floor(withinGroup));
  return { verse: anchor.numbers[index], fraction: withinGroup - index };
}

export function positionOffset(anchors, position) {
  if (!anchors.length || !position) return 0;
  if (position.intro !== undefined) return Math.max(0, anchors[0].top * position.intro);
  const exact = anchors.find(anchor => anchor.numbers.includes(position.verse));
  const anchor = exact || anchors.find(candidate => candidate.numbers[0] > position.verse) || anchors.at(-1);
  const fraction = exact ? (anchor.numbers.indexOf(position.verse) + position.fraction) / anchor.numbers.length : 0;
  return Math.max(0, anchor.top + Math.max(1, anchor.end - anchor.top) * fraction);
}

export function elementAnchors(element) {
  const origin = element.getBoundingClientRect().top;
  const anchors = [...element.querySelectorAll('.bible-verse-start[data-reference]')].map(node => ({
    numbers: referenceNumbers(node.dataset.reference),
    top: node.getBoundingClientRect().top - origin + element.scrollTop,
  })).filter(anchor => anchor.numbers.length);
  return anchors.map((anchor, index) => ({ ...anchor, end: anchors[index + 1]?.top ?? element.scrollHeight }));
}
