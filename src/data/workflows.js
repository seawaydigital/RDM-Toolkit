/**
 * Common research tasks — the tools strung together in the order a researcher
 * would use them. Rendered by the Tasks page, the sidebar's "By task" mode, the
 * homepage and the step-by-step WorkflowBar.
 *
 * Shape:
 *   { id, title, stage, summary, keywords?: string[], featured?: true,
 *     note?: string,                       — shown on the task card
 *     steps: [{ tool | page, why, caveat? }] }
 *
 * A step points at exactly one tool id (src/data/toolRegistry.js) or page hash
 * (PAGES in src/App.jsx). tests/workflows.test.mjs enforces that every id
 * exists, so a renamed tool cannot leave a dead step behind.
 *
 * Copy rules: say only what the tool actually does (read its source if unsure),
 * and never imply this site sends or stores files — every step happens in the
 * browser, and moving files between people is outside the toolkit.
 */
import { buildHash } from '../utils/route.js';

export const STAGES = [
  { id: 'plan', label: 'Plan', blurb: 'Before you collect anything' },
  { id: 'collect', label: 'Collect', blurb: 'Gathering data and documents' },
  { id: 'analyse', label: 'Analyse', blurb: 'Cleaning and checking data' },
  { id: 'share', label: 'Share', blurb: 'Sending files to other people' },
  { id: 'preserve', label: 'Preserve', blurb: 'Depositing and archiving' },
];

export const WORKFLOWS = [
  {
    id: 'plan-storage-dmp',
    title: 'Plan storage for a data management plan',
    stage: 'plan',
    featured: true,
    summary: 'Work out how sensitive your data is, how much space it needs and what your funding agency expects, before you write the DMP.',
    keywords: ['dmp', 'data management plan', 'grant', 'storage', 'classification'],
    steps: [
      { page: 'data-classification', why: 'Find your data’s classification under Lakehead’s standard. It decides where the data may be stored and who may see it.' },
      { page: 'storage-calculator', why: 'Estimate how much storage you need, including backups, and copy the ready-made DMP wording.' },
      { page: 'tri-agency-policy', why: 'Check what your agency expects for data management plans and data deposit.' },
    ],
  },
  {
    id: 'reb-package',
    title: 'Assemble an REB application package',
    stage: 'plan',
    featured: true,
    summary: 'Combine your protocol, consent forms and instruments into one tidy, numbered PDF.',
    keywords: ['reb', 'ethics', 'application', 'consent form', 'protocol'],
    steps: [
      {
        tool: 'merge-pdfs',
        why: 'Put the documents in order and fix any sideways pages.',
        caveat: 'Merging removes fillable fields and signature boxes. Collect any signatures first, then merge.',
      },
      { tool: 'add-cover-page', why: 'Add a title page with the study title, investigators and date.' },
      { tool: 'add-page-numbers', why: 'Number the pages so reviewers can point to them.' },
      { tool: 'compress-pdf', why: 'Make the file smaller if it is too large to upload or email.' },
    ],
  },
  {
    id: 'clean-csv-export',
    title: 'Clean up a spreadsheet export',
    stage: 'analyse',
    summary: 'Fix garbled accented characters in a CSV, then confirm nothing else changed before you analyse it.',
    keywords: ['csv', 'excel', 'encoding', 'accents', 'garbled', 'utf-8'],
    steps: [
      {
        tool: 'csv-encoding-fixer',
        why: 'Convert an older Windows or Excel export to UTF-8, so accented characters stop turning into ? or � in other software.',
        caveat: 'If Excel itself shows é as Ã©, the file is probably already UTF-8. Open it in Excel with Data → From Text/CSV and choose UTF-8.',
      },
      { tool: 'csv-diff', why: 'Compare the original and the fixed file cell by cell to confirm only the characters changed.' },
      { tool: 'csv-json-converter', why: 'Optional: convert to JSON if your analysis code expects it.' },
    ],
  },
  {
    id: 'share-participant-data',
    title: 'Share participant data with a collaborator',
    stage: 'share',
    featured: true,
    summary: 'Replace identifiers with codes, clear hidden metadata and give the recipient a way to check the files arrived intact.',
    keywords: ['participant', 'share', 'collaborator', 'co-investigator', 'send', 'de-identify', 'anonymize'],
    note: 'This site does not send files anywhere. To share them, use a service your data classification allows (for example, Lakehead OneDrive shared only with named people) or a 7-Zip archive with AES-256 encryption, and send the password by a different route. PDFs can also be locked with Password Protect PDF.',
    steps: [
      {
        tool: 'data-anonymizer',
        why: 'Replace names, emails and IDs with codes. Keep the key file that links codes to people separate from the data, and never send the two together.',
        caveat: 'While the key file exists, coded data can be re-identified. Share only what your REB approval allows.',
      },
      { tool: 'strip-file-metadata', why: 'If you are also sending PDFs or images, remove author names and other hidden details.' },
      { tool: 'checksum-verifier', why: 'Use “Generate Manifest” to make a checksum list. Send it separately so the recipient can confirm nothing changed on the way.' },
    ],
  },
  {
    id: 'share-fieldwork-photos',
    title: 'Share fieldwork photos safely',
    stage: 'share',
    summary: 'Photos can record exactly where they were taken. Remove that, then trim and shrink them before sharing.',
    keywords: ['photo', 'image', 'gps', 'location', 'fieldwork', 'exif'],
    steps: [
      { tool: 'strip-image-metadata', why: 'See and remove the GPS location, camera details and timestamps stored in each photo.' },
      {
        tool: 'image-cropper',
        why: 'Crop out faces, licence plates, signs or anything else that identifies a person or place.',
        caveat: 'Cropping removes what is outside your selection. It does not blur anything inside it.',
      },
      { tool: 'compress-image', why: 'Make the files small enough to email or upload.' },
    ],
  },
  {
    id: 'redacted-document',
    title: 'Send a document with sensitive details removed',
    stage: 'share',
    summary: 'Black out names and other details for good, label the copy, and clear the document properties.',
    keywords: ['redact', 'black out', 'disclosure', 'confidential', 'remove names'],
    steps: [
      { tool: 'pdf-redaction', why: 'Black out names and other details. Redacted pages are turned into images, so the hidden text cannot be copied back out.' },
      { tool: 'pdf-watermark', why: 'Label the copy (for example, REDACTED COPY) so it is not mistaken for the original.' },
      { tool: 'strip-file-metadata', why: 'Clear the author name and other document properties before the file goes out.' },
    ],
  },
  {
    id: 'verify-transfer',
    title: 'Check files arrived intact',
    stage: 'preserve',
    summary: 'Record a checksum for each file before you move it, then check the copies against that list afterwards.',
    keywords: ['checksum', 'verify', 'integrity', 'transfer', 'copy', 'backup', 'hash'],
    steps: [
      { tool: 'checksum-verifier', why: 'Before the move, use “Generate Manifest” and download the checksum list (SHA256SUMS.txt).' },
      { tool: 'checksum-verifier', why: 'After the move, use “Verify Files” with that list and the copied files. Any mismatch means the file changed.' },
    ],
  },
  {
    id: 'deposit-dataset',
    title: 'Prepare a dataset for deposit',
    stage: 'preserve',
    featured: true,
    summary: 'Get a dataset ready for Lakehead’s collection on Borealis: no identifiers, readable files and a checksum for each one.',
    keywords: ['deposit', 'dataverse', 'borealis', 'repository', 'publish data', 'archive'],
    steps: [
      { tool: 'data-anonymizer', why: 'Remove or code direct identifiers. Borealis does not accept identifiable data, even with restricted access.' },
      { tool: 'csv-encoding-fixer', why: 'Save tabular files as UTF-8 so they open correctly in any software.' },
      { tool: 'checksum-verifier', why: 'Generate a checksum list so future users can confirm their copy is intact.' },
      { page: 'lakehead-dataverse', why: 'Follow the deposit steps for Lakehead’s collection on Borealis.' },
    ],
  },
  {
    id: 'thesis-pdf',
    title: 'Prepare your thesis PDF',
    stage: 'preserve',
    summary: 'Check page sizes and combine chapters if you need to, then produce the PDF/A file the Faculty of Graduate Studies requires.',
    keywords: ['thesis', 'dissertation', 'graduate', 'pdf/a', 'fgs'],
    note: 'Your final copy must be PDF/A, unlocked and unsigned. None of the tools on this site produce PDF/A, so the last step happens in Word, LibreOffice or OCRmyPDF.',
    steps: [
      { tool: 'pdf-page-inspector', why: 'Check that every page is the same size. Chapters from different sources often mix Letter and A4.' },
      { tool: 'merge-pdfs', why: 'Only if your chapters are separate PDFs: combine them in order.' },
      { page: 'thesis', why: 'Convert to PDF/A, and check the licence, embargo and other Faculty of Graduate Studies requirements before you submit.' },
    ],
  },
];

export function getWorkflow(id) {
  return WORKFLOWS.find(w => w.id === id) || null;
}

/** Validated task progress from route params, or null. */
export function getTaskFromParams(params = {}) {
  const workflow = getWorkflow(params.task);
  if (!workflow || !/^\d+$/.test(params.step || '')) return null;
  const step = Number(params.step);
  if (step < 1 || step > workflow.steps.length) return null;
  return { id: workflow.id, step };
}

/** Hash for step `step` (1-based) of a workflow. */
export function stepHash(workflow, step) {
  const target = workflow.steps[step - 1];
  return buildHash(target.tool || target.page, { task: workflow.id, step });
}
