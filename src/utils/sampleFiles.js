/**
 * Fictional sample files for "No file handy? Try a sample" (DropZone `sample`
 * prop). Everything is generated in the browser — the security audit forbids
 * network requests, and generating keeps the samples obviously fake: example.org
 * emails, 555-01xx phone numbers, invented names, and a GPS position stamped
 * into the photo on purpose.
 *
 * Pinned to the entry chunk in vite.config.js: three lazy tools import it, and
 * the bundle-integrity guard rejects the shared chunk Rolldown would otherwise
 * emit. The pure builders are unit-tested in tests/sampleFiles.test.mjs.
 */

// ── Participants CSV (De-identify Research Data) ────────────────────────────

const SAMPLE_PARTICIPANTS = [
  ['P001', 'Avery Tremblay', 'avery.tremblay@example.org', '807-555-0101', 'Thunder Bay', '2026-03-02', 'Works at the clinic on Red River Road, has two children'],
  ['P002', 'Jordan Okafor', 'j.okafor@example.org', '807-555-0102', 'Thunder Bay', '2026-03-03', 'Recently moved from Winnipeg, prefers evening calls'],
  ['P003', 'Sam Beaulieu', 'sam.beaulieu@example.org', '807-555-0103', 'Orillia', '2026-03-05', 'Mentioned volunteering at the food bank'],
  ['P004', 'Riley Kowalski', 'rkowalski@example.org', '807-555-0104', 'Orillia', '2026-03-06', 'Only nurse practitioner in their township'],
  ['P005', 'Morgan Desjardins', 'morgan.d@example.org', '807-555-0105', 'Thunder Bay', '2026-03-09', 'Asked for transcript by email'],
  ['P006', 'Casey Whitehorse', 'casey.whitehorse@example.org', '807-555-0106', 'Thunder Bay', '2026-03-10', 'Grew up in Kenora, now a high school teacher'],
  ['P007', 'Taylor Nguyen', 'tnguyen@example.org', '807-555-0107', 'Orillia', '2026-03-12', 'Rescheduled twice, prefers mornings'],
  ['P008', 'Jamie MacLeod', 'jamie.macleod@example.org', '807-555-0108', 'Thunder Bay', '2026-03-13', 'Former Lakehead staff member'],
];

const csvField = value => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function buildSampleParticipantsCsv() {
  const header = ['participant_id', 'full_name', 'email', 'phone', 'site', 'interview_date', 'notes'];
  return [header, ...SAMPLE_PARTICIPANTS].map(row => row.map(csvField).join(',')).join('\n') + '\n';
}

// ── EXIF writer (Strip Image Metadata) ──────────────────────────────────────
// Writes a minimal big-endian TIFF structure inside a JPEG APP1 segment:
// IFD0 (Make, Model, Software, DateTime, pointers) → Exif IFD
// (DateTimeOriginal) and GPS IFD (version, latitude, longitude).

export const SAMPLE_PHOTO_EXIF = {
  make: 'RDM Toolkit',
  model: 'Sample Camera (fictional)',
  software: 'RDM Toolkit sample generator',
  dateTime: '2026:06:21 14:30:00',
  // Lakehead's Thunder Bay campus — a recognisable spot to show what GPS reveals.
  latitude: 48.4211,
  longitude: -89.2600,
};

const TYPE = { BYTE: 1, ASCII: 2, SHORT: 3, LONG: 4, RATIONAL: 5 };
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };

const ascii = (tag, text) => ({ tag, type: TYPE.ASCII, values: [...new TextEncoder().encode(`${text}\0`)] });
const long = (tag, value) => ({ tag, type: TYPE.LONG, values: [value] });

// Decimal degrees → [[deg, 1], [min, 1], [sec * 100, 100]] for a GPS RATIONAL triple.
function toDms(decimal) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec100 = Math.round((minFloat - min) * 60 * 100);
  return [[deg, 1], [min, 1], [sec100, 100]];
}

function ifdByteLength(entries) {
  // Values longer than 4 bytes live after the entries, padded to an even offset.
  const data = entries.reduce((sum, e) => {
    const size = TYPE_SIZE[e.type] * e.values.length;
    return sum + (size > 4 ? size + (size % 2) : 0);
  }, 0);
  return 2 + entries.length * 12 + 4 + data;
}

function writeIfd(view, offset, entries) {
  const sorted = [...entries].sort((a, b) => a.tag - b.tag);
  let dataOffset = offset + 2 + sorted.length * 12 + 4;
  view.setUint16(offset, sorted.length);
  sorted.forEach((e, i) => {
    const at = offset + 2 + i * 12;
    const count = e.values.length;
    const size = TYPE_SIZE[e.type] * count;
    view.setUint16(at, e.tag);
    view.setUint16(at + 2, e.type);
    view.setUint32(at + 4, count);
    const target = size > 4 ? dataOffset : at + 8;
    if (size > 4) {
      view.setUint32(at + 8, dataOffset);
      dataOffset += size + (size % 2);
    }
    e.values.forEach((v, j) => {
      if (e.type === TYPE.BYTE || e.type === TYPE.ASCII) view.setUint8(target + j, v);
      else if (e.type === TYPE.SHORT) view.setUint16(target + j * 2, v);
      else if (e.type === TYPE.LONG) view.setUint32(target + j * 4, v);
      else if (e.type === TYPE.RATIONAL) {
        view.setUint32(target + j * 8, v[0]);
        view.setUint32(target + j * 8 + 4, v[1]);
      }
    });
  });
  view.setUint32(offset + 2 + sorted.length * 12, 0); // no next IFD
}

export function buildExifSegment({ make, model, software, dateTime, latitude, longitude }) {
  const exifIfd = [ascii(0x9003, dateTime)];
  const gpsIfd = [
    { tag: 0x0000, type: TYPE.BYTE, values: [2, 3, 0, 0] },
    ascii(0x0001, latitude >= 0 ? 'N' : 'S'),
    { tag: 0x0002, type: TYPE.RATIONAL, values: toDms(latitude) },
    ascii(0x0003, longitude >= 0 ? 'E' : 'W'),
    { tag: 0x0004, type: TYPE.RATIONAL, values: toDms(longitude) },
  ];
  // Pointer values are filled in once the layout is known.
  const ifd0 = [
    ascii(0x010f, make),
    ascii(0x0110, model),
    ascii(0x0131, software),
    ascii(0x0132, dateTime),
    long(0x8769, 0),
    long(0x8825, 0),
  ];

  const ifd0Offset = 8; // straight after the TIFF header
  const exifOffset = ifd0Offset + ifdByteLength(ifd0);
  const gpsOffset = exifOffset + ifdByteLength(exifIfd);
  const tiffLength = gpsOffset + ifdByteLength(gpsIfd);
  ifd0[4].values = [exifOffset];
  ifd0[5].values = [gpsOffset];

  const header = [0xff, 0xe1, 0, 0, ...new TextEncoder().encode('Exif'), 0, 0];
  const segment = new Uint8Array(header.length + tiffLength);
  segment.set(header);
  const segmentLength = segment.length - 2; // the length field excludes the marker
  segment[2] = segmentLength >> 8;
  segment[3] = segmentLength & 0xff;

  const tiff = new DataView(segment.buffer, header.length);
  tiff.setUint8(0, 0x4d); // "MM" — big-endian
  tiff.setUint8(1, 0x4d);
  tiff.setUint16(2, 42);
  tiff.setUint32(4, ifd0Offset);
  writeIfd(tiff, ifd0Offset, ifd0);
  writeIfd(tiff, exifOffset, exifIfd);
  writeIfd(tiff, gpsOffset, gpsIfd);
  return segment;
}

/** Insert an APP1 segment directly after a JPEG's start-of-image marker. */
export function insertExif(jpegBytes, segment) {
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) throw new Error('Sample photo is not a JPEG');
  const out = new Uint8Array(jpegBytes.length + segment.length);
  out.set(jpegBytes.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(jpegBytes.subarray(2), 2 + segment.length);
  return out;
}

// ── Browser-only creators: return a File ready for DropZone ────────────────

export async function createSampleCsvFile() {
  return new File([buildSampleParticipantsCsv()], 'sample-participants.csv', { type: 'text/csv' });
}

export async function createSamplePhotoFile() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 533;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#5B8DB8');
  sky.addColorStop(0.62, '#C9DCEB');
  sky.addColorStop(0.62, '#3E6B48');
  sky.addColorStop(1, '#24402B');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2A3F55';
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.lineTo(220, 210);
  ctx.lineTo(420, 300);
  ctx.lineTo(610, 190);
  ctx.lineTo(800, 320);
  ctx.lineTo(800, 340);
  ctx.lineTo(0, 340);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Sample photo — fictional', 32, 470);
  ctx.font = '18px sans-serif';
  ctx.fillText('Contains a made-up GPS location and camera details', 32, 502);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create the sample photo'))), 'image/jpeg', 0.85);
  });
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const withExif = insertExif(jpeg, buildExifSegment(SAMPLE_PHOTO_EXIF));
  return new File([withExif], 'sample-fieldwork-photo.jpg', { type: 'image/jpeg' });
}

const SAMPLE_NOTES = [
  [
    'Interview notes — SAMPLE (all people and details are fictional)',
    '',
    'Participant: Avery Tremblay (P001)',
    'Date: 2 March 2026        Interviewer: Dr. Jordan Okafor',
    'Phone: 807-555-0101       Email: avery.tremblay@example.org',
    '',
    'Avery works at the clinic on Red River Road and has two children.',
    'They described the commute from Kakabeka Falls as the hardest part',
    'of the job, especially in winter.',
    '',
    'Follow-up: send the consent form copy to the address above.',
  ],
  [
    'Interview notes — SAMPLE (continued)',
    '',
    'Participant: Sam Beaulieu (P003)',
    'Date: 5 March 2026        Interviewer: Dr. Jordan Okafor',
    'Phone: 807-555-0103       Email: sam.beaulieu@example.org',
    '',
    'Sam volunteers at the Orillia food bank every Saturday and asked',
    'that the organisation not be named in any publication.',
    '',
    'Try it: draw redaction boxes over the names, phone numbers and emails.',
  ],
];

export async function createSamplePdfFile() {
  const { PDFDocument, StandardFonts, rgb } = await import('@cantoo/pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle('Sample interview notes (fictional)');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const lines of SAMPLE_NOTES) {
    const page = doc.addPage([612, 792]); // US Letter
    let y = 720;
    lines.forEach((line, i) => {
      page.drawText(line, { x: 64, y, size: i === 0 ? 15 : 12, font: i === 0 ? bold : font, color: rgb(0.1, 0.1, 0.12) });
      y -= i === 0 ? 30 : 20;
    });
  }
  const bytes = await doc.save();
  return new File([bytes], 'sample-interview-notes.pdf', { type: 'application/pdf' });
}
