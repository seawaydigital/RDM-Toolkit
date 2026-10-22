import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFStream, PDFRawStream, decodePDFRawStream } from '@cantoo/pdf-lib';

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

const isPageDict = (o) => o instanceof PDFDict && o.get(PDFName.of('Type')) === PDFName.of('Page');

// copyPages() follows every reference on a copied page, so an annotation that
// points at a page the user removed (a link /Dest, a GoTo action, /P, an
// article bead's /N, a form field whose /Kids include that page's widget)
// pulls the removed page — content stream and all — into the output as an
// object no viewer shows but anyone can extract. Call this on the output
// document after addPage() and before save(): it drops every reference to a
// page outside the page tree (and to annotations that belong to such a page),
// so links to removed pages go dead, then deletes everything no longer
// reachable from the trailer. Returns how many objects it deleted.
export function pruneToPageTree(pdfDoc) {
  const ctx = pdfDoc.context;
  const pages = pdfDoc.getPages();
  const inTree = new Set(pages.map((p) => p.ref.tag));
  const objects = ctx.enumerateIndirectObjects();
  const dead = new Set(objects.filter(([ref, obj]) => isPageDict(obj) && !inTree.has(ref.tag)).map(([ref]) => ref.tag));
  if (dead.size === 0) return 0;
  const isDead = (v) => v instanceof PDFRef && dead.has(v.tag);

  // An annotation shown on a kept page belongs to that page, whatever its /P says.
  for (const page of pages) {
    const annots = page.node.lookup(PDFName.of('Annots'));
    if (!(annots instanceof PDFArray)) continue;
    for (const entry of annots.asArray()) {
      const annot = ctx.lookup(entry);
      if (annot instanceof PDFDict && isDead(annot.get(PDFName.of('P')))) annot.set(PDFName.of('P'), page.ref);
    }
  }
  // Annotations and beads whose /P is a removed page belong to that page.
  for (const [ref, obj] of objects) {
    if (obj instanceof PDFDict && !isPageDict(obj) && isDead(obj.get(PDFName.of('P')))) dead.add(ref.tag);
  }

  // A destination array names its page first: [page /XYZ left top zoom].
  const isDeadDest = (v) => v instanceof PDFArray && v.size() > 0 && isDead(v.get(0));
  const cleanArray = (arr) => {
    for (let i = arr.size() - 1; i >= 0; i--) {
      const el = arr.get(i);
      if (isDead(el)) arr.remove(i);
      else if (el instanceof PDFDict) cleanDict(el);
    }
  };
  const cleanDict = (dict) => {
    for (const [key, value] of dict.entries()) {
      if (isDead(value) || isDeadDest(value)) { dict.delete(key); continue; }
      if (value instanceof PDFArray) cleanArray(value);
      else if (value instanceof PDFDict) {
        cleanDict(value);
        // A GoTo action whose destination was removed does nothing; drop it.
        if (value.get(PDFName.of('S')) === PDFName.of('GoTo') && !value.has(PDFName.of('D'))) dict.delete(key);
      }
    }
  };
  for (const [ref, obj] of objects) {
    if (dead.has(ref.tag)) continue;
    if (obj instanceof PDFStream) cleanDict(obj.dict);
    else if (obj instanceof PDFDict) cleanDict(obj);
    else if (obj instanceof PDFArray) cleanArray(obj);
  }

  // Sweep: delete every object no longer reachable from the trailer.
  const reached = new Set();
  const visit = (v) => {
    if (v instanceof PDFRef) {
      if (reached.has(v.tag)) return;
      reached.add(v.tag);
      const target = ctx.lookup(v);
      if (target !== undefined) visit(target);
    } else if (v instanceof PDFStream) visit(v.dict);
    else if (v instanceof PDFDict) for (const [, e] of v.entries()) visit(e);
    else if (v instanceof PDFArray) for (const e of v.asArray()) visit(e);
  };
  for (const key of ['Root', 'Info', 'Encrypt']) if (ctx.trailerInfo[key]) visit(ctx.trailerInfo[key]);
  let deleted = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!reached.has(ref.tag)) { ctx.delete(ref); deleted++; }
  }
  return deleted;
}

// Post-save check: every /Type /Page object in the saved bytes must belong to
// the page tree. An orphaned page is a copy of source content that no viewer
// shows but anyone can extract, so the caller refuses the download if this
// returns anything. Returns the orphaned object refs as strings.
export async function findPagesOutsidePageTree(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const inTree = new Set(doc.getPages().map((p) => p.ref.toString()));
  return doc.context.enumerateIndirectObjects()
    .filter(([ref, obj]) => obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Page') && !inTree.has(ref.toString()))
    .map(([ref]) => ref.toString());
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
