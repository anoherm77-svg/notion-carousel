export function getPlainText(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map((r) => r.plain_text || '').join('');
}

export function getImageUrl(block) {
  if (!block?.image) return null;
  const img = block.image;
  if (img.file?.url) return img.file.url;
  if (img.external?.url) return img.external.url;
  return null;
}
