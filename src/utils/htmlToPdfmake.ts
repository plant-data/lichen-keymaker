// Converts the small subset of HTML used in `leadText` / `species_description`
// into pdfmake text runs. Pure string -> object: no DOM is touched, so this is
// safe to run inside a Web Worker (where `DOMParser` does not exist, which is
// also why the `html-to-pdfmake` library is not an option here).
//
// Supported markup: <i>/<em> -> italics, <b>/<strong> -> bold, <br> -> newline.
// <sub>/<sup> and any other tags are stripped but their text is kept inline
// (pdfmake has no real sub/superscript). Common HTML entities are decoded.

export interface PdfTextRun {
  text: string
  italics?: boolean
  bold?: boolean
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  times: '×',
  divide: '÷',
  deg: '°',
  micro: 'µ',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  middot: '·'
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X'
      const code = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (Number.isNaN(code)) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    }
    return NAMED_ENTITIES[body] ?? match
  })
}

// Matches either a tag (`<i>`, `</strong>`, `<br/>`, `<a href="…">`) or a run of
// plain text up to the next `<`.
const TOKEN_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*?>|([^<]+)/g

export function htmlToPdfmake(html: string | null | undefined): PdfTextRun[] {
  if (!html) return [{ text: '' }]

  const runs: PdfTextRun[] = []
  let italicDepth = 0
  let boldDepth = 0

  TOKEN_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN_REGEX.exec(html)) !== null) {
    const [full, tagName, textChunk] = match

    if (textChunk !== undefined) {
      const text = decodeEntities(textChunk)
      if (text.length > 0) {
        const run: PdfTextRun = { text }
        if (italicDepth > 0) run.italics = true
        if (boldDepth > 0) run.bold = true
        runs.push(run)
      }
      continue
    }

    const tag = tagName.toLowerCase()
    const isClose = full[1] === '/'
    switch (tag) {
      case 'i':
      case 'em':
        italicDepth = isClose ? Math.max(0, italicDepth - 1) : italicDepth + 1
        break
      case 'b':
      case 'strong':
        boldDepth = isClose ? Math.max(0, boldDepth - 1) : boldDepth + 1
        break
      case 'br':
        runs.push({ text: '\n' })
        break
      // <sub>, <sup> and unknown tags: dropped, their text content is kept.
    }
  }

  return runs.length > 0 ? runs : [{ text: '' }]
}
