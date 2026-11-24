const FONT_SIZE_RE =
  /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|\[[^\]]*(px|rem|em|%)\]|\[length:[^\]]+\])$/;
const TEXT_ALIGN_RE = /^text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;
const BORDER_WIDTH_RE = /^border(-[0248]|-\[\d+px\])?$/;
const BORDER_STYLE_RE = /^border-(solid|dashed|dotted|double|hidden|none)$/;
const FONT_WEIGHT_RE =
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;

function classifyToken(token: string): string | null {
  const parts = token.split(':');
  const utility = parts.pop() || '';
  const prefix = parts.length > 0 ? `${parts.join(':')}:` : '';
  const clean = utility.replace(/!$/, '');

  if (FONT_SIZE_RE.test(clean)) return `${prefix}text-size`;
  if (TEXT_ALIGN_RE.test(clean)) return `${prefix}text-align`;
  if (clean.startsWith('text-')) return `${prefix}text-color`;

  if (clean.startsWith('bg-') && !clean.startsWith('bg-gradient-') && !clean.startsWith('bg-clip-')) {
    return `${prefix}bg`;
  }

  if (BORDER_WIDTH_RE.test(clean)) return `${prefix}border-width`;
  if (BORDER_STYLE_RE.test(clean)) return `${prefix}border-style`;
  if (
    clean.startsWith('border-') &&
    !/^border-(t|r|b|l|x|y|s|e)(-|$)/.test(clean) &&
    !clean.startsWith('border-spacing') &&
    !clean.startsWith('border-collapse')
  ) {
    return `${prefix}border-color`;
  }

  if (clean.startsWith('px-')) return `${prefix}px`;
  if (clean.startsWith('py-')) return `${prefix}py`;
  if (clean.startsWith('p-')) return `${prefix}p`;
  if (clean.startsWith('min-h-')) return `${prefix}min-h`;
  if (clean.startsWith('h-')) return `${prefix}h`;
  if (clean.startsWith('min-w-')) return `${prefix}min-w`;
  if (clean.startsWith('w-')) return `${prefix}w`;
  if (clean.startsWith('gap-')) return `${prefix}gap`;
  if (clean === 'rounded' || clean.startsWith('rounded-')) return `${prefix}rounded`;
  if (clean === 'shadow' || clean.startsWith('shadow-')) {
    // Distinguish shadow size vs shadow color (e.g. shadow-md vs shadow-blue-600/20)
    if (/^shadow-(2xs|xs|sm|md|lg|xl|2xl|inner|none)$/.test(clean) || clean === 'shadow') {
      return `${prefix}shadow-size`;
    }
    return `${prefix}shadow-color`;
  }
  if (FONT_WEIGHT_RE.test(clean)) return `${prefix}font-weight`;
  if (clean.startsWith('ring-') && !/^ring-(0|1|2|4|8|inset|offset)/.test(clean)) {
    return `${prefix}ring-color`;
  }

  return null;
}

/**
 * Menggabungkan kelas utilitas tombol dengan resolusi konflik Tailwind CSS v4:
 * kelas yang ditulis belakangan selalu menggantikan kelas sejenis sebelumnya
 * (mis. text-rose-700 menggantikan text-slate-700 tanpa bergantung urutan stylesheet).
 */
export function mergeButtonClasses(...groups: Array<string | undefined | null | false>): string {
  const tokens = groups
    .filter((g): g is string => Boolean(g && g.trim()))
    .flatMap((g) => g.trim().split(/\s+/));

  const seenKey = new Set<string>();
  const keptReversed: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    const key = classifyToken(token);
    if (key) {
      if (seenKey.has(key)) continue;
      seenKey.add(key);
    } else if (seenKey.has(`exact:${token}`)) {
      continue;
    } else {
      seenKey.add(`exact:${token}`);
    }
    keptReversed.push(token);
  }

  return keptReversed.reverse().join(' ');
}
