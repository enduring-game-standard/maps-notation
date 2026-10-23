export const LABEL_WRAP = 16
export const LABEL_LINE = 14
// widest lowercase italic serif at 13 px, measured in Chromium
export const LABEL_CHAR = 6.2

export function wrapLabel(s: string): string[] {
  const lines: string[] = []
  let cur = ''
  for (const word of s.split(' ')) { if (cur && (cur + ' ' + word).length > LABEL_WRAP) { lines.push(cur); cur = word } else cur = cur ? cur + ' ' + word : word }
  if (cur) lines.push(cur)
  return lines
}

export const labelWidth = (lines: string[]) => Math.max(...lines.map((l) => l.length)) * LABEL_CHAR
