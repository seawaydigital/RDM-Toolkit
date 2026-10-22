import { PDFName, PDFDict, PDFArray, PDFStream, PDFRawStream, decodePDFRawStream } from '@cantoo/pdf-lib';

// Page-subset tools (Delete Pages, Split PDF, PDF Redaction) copy kept pages
// with copyPages(), which copies a page's whole /Resources dictionary. When
// pages share one dictionary — by reference, or inherited from the /Pages
// node — that dictionary also holds the XObjects (scanned images, text wrapped
// in forms) that only the removed or redacted pages draw, so they would ship
// in the output. isolatePageResources() gives one source page its own
// /Resources containing only the entries its content actually names. Call it
// on each kept page before copyPages(); it modifies the source document, so
// use a freshly loaded one.

const decoder = new TextDecoder('latin1');

function streamText(stream) {
  if (stream instanceof PDFRawStream) return decoder.decode(decodePDFRawStream(stream).decode());
  if (typeof stream.getUnencodedContents === 'function') return decoder.decode(stream.getUnencodedContents());
  throw new Error('unsupported stream type');
}

// Every /Name token in a content stream. Over-inclusion (a name that is an
// operand of some other operator, or bytes inside an inline image) only keeps
// an extra resource; missing a name would break rendering, so err wide.
function namesIn(text) {
  const names = new Set();
  for (const m of text.matchAll(/\/([^\s/[\]()<>{}%]+)/g)) {
    names.add(m[1]);
    names.add(m[1].replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }
  return names;
}

function pageContentStreams(page, ctx) {
  const contents = page.node.get(PDFName.of('Contents'));
  if (!contents) return [];
  const resolved = ctx.lookup(contents);
  if (resolved instanceof PDFArray) return resolved.asArray().map((r) => ctx.lookup(r));
  return [resolved];
}

// Returns true when the page now has its own pruned /Resources, false when it
// was left untouched (no resources, or content it could not decode).
export function isolatePageResources(pdfDoc, pageIndex) {
  const ctx = pdfDoc.context;
  const page = pdfDoc.getPage(pageIndex);
  const res = page.node.Resources();
  if (!(res instanceof PDFDict)) return false;

  let used;
  try {
    used = new Set();
    for (const s of pageContentStreams(page, ctx)) for (const n of namesIn(streamText(s))) used.add(n);
  } catch {
    return false;
  }

  // Forms, tiling patterns and Type3-style content that resolve names against
  // this same dictionary (no /Resources of their own, or /Resources pointing
  // back at it) add their names too, until nothing new appears.
  const sharesRes = (stream) => {
    const own = stream.dict.lookup(PDFName.of('Resources'));
    return own === undefined || own === res;
  };
  const visited = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [category, sub] of res.entries()) {
      const subDict = ctx.lookup(sub);
      if (!(subDict instanceof PDFDict)) continue;
      for (const [name, value] of subDict.entries()) {
        const key = `${category.asString()}${name.asString()}`;
        if (visited.has(key) || !used.has(name.asString().slice(1))) continue;
        visited.add(key);
        const target = ctx.lookup(value);
        if (!(target instanceof PDFStream) || !sharesRes(target)) continue;
        let names;
        try { names = namesIn(streamText(target)); } catch { return false; }
        for (const n of names) if (!used.has(n)) { used.add(n); grew = true; }
      }
    }
  }

  const pruned = ctx.obj({});
  const prunedRef = ctx.register(pruned);
  for (const [category, sub] of res.entries()) {
    const subDict = ctx.lookup(sub);
    if (!(subDict instanceof PDFDict)) { pruned.set(category, sub); continue; }
    const keep = ctx.obj({});
    for (const [name, value] of subDict.entries()) {
      if (!used.has(name.asString().slice(1))) continue;
      const target = ctx.lookup(value);
      if (target instanceof PDFStream && target.dict.lookup(PDFName.of('Resources')) === res) {
        // Cloned so the form points at the pruned dictionary without changing
        // the original, which other pages may still draw.
        const clone = target.clone(ctx);
        clone.dict.set(PDFName.of('Resources'), prunedRef);
        keep.set(name, ctx.register(clone));
      } else {
        keep.set(name, value);
      }
    }
    pruned.set(category, keep);
  }
  page.node.set(PDFName.of('Resources'), prunedRef);
  return true;
}
