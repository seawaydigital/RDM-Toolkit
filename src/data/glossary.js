/**
 * Glossary terms, rendered by the Glossary page and included in site search.
 *
 * Shape: { id, term, aka?: string[], definition, related?: [termId], link?: { label, hash } }
 *
 * Definitions must agree with how the rest of the site uses each term (for
 * example, "coded" and "anonymized" follow TCPS 2 (2022) Chapter 5, the same
 * wording De-identify Research Data relies on). Plain strings only — no HTML.
 * tests/glossary.test.mjs checks ids, cross-references and length.
 */
export const GLOSSARY = [
  {
    id: 'aes-256',
    term: 'AES-256',
    definition: 'A widely used encryption standard with a 256-bit key. Encrypt / Decrypt Text and Password Protect PDF both use it, through your browser’s built-in cryptography.',
    related: ['encryption'],
  },
  {
    id: 'anonymized-data',
    term: 'Anonymized data',
    definition: 'Data permanently stripped of direct identifiers, with no key kept to re-link it, and a low risk of re-identifying anyone from what remains (TCPS 2). Different from coded data, which can be re-identified with its key.',
    related: ['coded-data', 'de-identification', 'indirect-identifier'],
    link: { label: 'De-identify Research Data', hash: 'data-anonymizer' },
  },
  {
    id: 'borealis',
    term: 'Borealis',
    aka: ['Dataverse'],
    definition: 'The Canadian research data repository, run on Dataverse software. Lakehead has its own collection there. It does not accept identifiable data, even with restricted access.',
    related: ['data-deposit', 'frdr', 'doi'],
    link: { label: 'Lakehead Dataverse guide', hash: 'lakehead-dataverse' },
  },
  {
    id: 'care',
    term: 'CARE Principles',
    definition: 'Principles for Indigenous data governance: Collective benefit, Authority to control, Responsibility and Ethics. Released in 2019 by the Global Indigenous Data Alliance to sit alongside the FAIR principles.',
    related: ['ocap', 'fair'],
    link: { label: 'Indigenous data governance', hash: 'tri-agency-policy' },
  },
  {
    id: 'checksum',
    term: 'Checksum',
    aka: ['Hash', 'SHA-256'],
    definition: 'A short fingerprint calculated from a file’s contents. If even one byte changes, the checksum changes, so comparing checksums before and after a transfer shows whether a file arrived intact. SHA-256 is the common choice.',
    related: ['data-deposit'],
    link: { label: 'Checksum Batch Verifier', hash: 'checksum-verifier' },
  },
  {
    id: 'coded-data',
    term: 'Coded data',
    definition: 'Data with direct identifiers removed and replaced by a code. Anyone with the key that links codes to people can re-identify participants, so TCPS 2 treats coded data as still needing protection and the key must be kept separately.',
    related: ['re-identification-key', 'anonymized-data', 'pseudonym'],
    link: { label: 'De-identify Research Data', hash: 'data-anonymizer' },
  },
  {
    id: 'data-classification',
    term: 'Data classification',
    definition: 'Sorting data by how much harm its exposure could cause. Lakehead’s standard has three tiers: Public, Internal / Private and Confidential / Sensitive. The tier decides where data may be stored and who may see it.',
    link: { label: 'Classify your data', hash: 'data-classification' },
  },
  {
    id: 'data-deposit',
    term: 'Data deposit',
    definition: 'Placing a finished dataset in a repository so it is preserved, described and citable, usually with a DOI. The Tri-Agency RDM Policy’s deposit requirement is being phased in, agency by agency.',
    related: ['borealis', 'frdr', 'doi', 'embargo'],
    link: { label: 'Lakehead Dataverse guide', hash: 'lakehead-dataverse' },
  },
  {
    id: 'dmp',
    term: 'Data management plan (DMP)',
    aka: ['DMP'],
    definition: 'A document describing how a project’s data will be collected, documented, stored, shared and preserved. Some Tri-Agency funding opportunities require one, and most are written in DMP Assistant.',
    related: ['data-classification'],
    link: { label: 'Tri-Agency RDM Policy', hash: 'tri-agency-policy' },
  },
  {
    id: 'de-identification',
    term: 'De-identification',
    definition: 'Removing or changing the information in a dataset that identifies people. It covers both coded data (re-identifiable with a key) and anonymized data (not re-identifiable).',
    related: ['coded-data', 'anonymized-data', 'direct-identifier', 'indirect-identifier'],
  },
  {
    id: 'direct-identifier',
    term: 'Direct identifier',
    definition: 'Information that identifies a person on its own, such as a name, email address, phone number, student number or health card number.',
    related: ['indirect-identifier', 'de-identification'],
  },
  {
    id: 'doi',
    term: 'DOI',
    aka: ['Digital Object Identifier'],
    definition: 'A permanent identifier and link for a publication or dataset. It keeps working even if the item moves to a new web address. Borealis assigns one to each published dataset.',
    related: ['pid', 'orcid'],
    link: { label: 'Grants & Identifiers', hash: 'grants-identifiers' },
  },
  {
    id: 'embargo',
    term: 'Embargo',
    definition: 'A delay before a thesis or dataset becomes public, for example while a paper or patent is pending. The description is usually visible during the embargo; the file itself is not.',
    link: { label: 'Thesis embargoes', hash: 'thesis' },
  },
  {
    id: 'encryption',
    term: 'Encryption',
    definition: 'Scrambling data so it can only be read with the right key or password. If the password is lost, the data cannot be recovered.',
    related: ['aes-256'],
  },
  {
    id: 'exif',
    term: 'EXIF',
    definition: 'Information stored inside photos by the camera or phone, often including the exact GPS location, date and time, and device model.',
    related: ['metadata'],
    link: { label: 'Strip Image Metadata', hash: 'strip-image-metadata' },
  },
  {
    id: 'fair',
    term: 'FAIR principles',
    definition: 'Findable, Accessible, Interoperable, Reusable: guidelines for making research data useful to others. The Tri-Agency RDM Policy encourages them. FAIR does not mean open — restricted data can still be FAIR.',
    related: ['care', 'data-deposit'],
  },
  {
    id: 'fippa',
    term: 'FIPPA',
    definition: 'Ontario’s Freedom of Information and Protection of Privacy Act. It governs personal information held by Ontario public institutions, including universities such as Lakehead.',
    related: ['phipa', 'pipeda', 'personal-information'],
  },
  {
    id: 'frdr',
    term: 'FRDR',
    aka: ['Federated Research Data Repository'],
    definition: 'A national repository run by the Digital Research Alliance of Canada, suited to large datasets. It publishes open-access data only, although an embargo is allowed.',
    related: ['borealis', 'data-deposit'],
    link: { label: 'DRAC services', hash: 'drac-services' },
  },
  {
    id: 'indirect-identifier',
    term: 'Indirect identifier',
    aka: ['Quasi-identifier'],
    definition: 'Information that does not identify someone alone but can when combined, such as age, postal code, occupation and a rare diagnosis. Removing names is not enough if these remain.',
    related: ['direct-identifier', 'anonymized-data'],
  },
  {
    id: 'metadata',
    term: 'Metadata',
    definition: 'Data about data. In a file, it is hidden information such as the author’s name or GPS location. For a deposited dataset, it is the description (title, creators, methods) that makes the data findable.',
    related: ['exif'],
    link: { label: 'Strip File Metadata', hash: 'strip-file-metadata' },
  },
  {
    id: 'ocap',
    term: 'OCAP®',
    definition: 'The First Nations principles of Ownership, Control, Access and Possession, which assert that First Nations communities govern how their data are collected, used and shared. OCAP® is a registered trademark of the First Nations Information Governance Centre (FNIGC).',
    related: ['care'],
    link: { label: 'Indigenous data governance', hash: 'tri-agency-policy' },
  },
  {
    id: 'orcid',
    term: 'ORCID iD',
    definition: 'A free, permanent 16-digit identifier that tells you apart from other researchers with similar names and links your publications, datasets and grants.',
    related: ['pid', 'doi'],
    link: { label: 'Grants & Identifiers', hash: 'grants-identifiers' },
  },
  {
    id: 'pdf-a',
    term: 'PDF/A',
    definition: 'An archival version of PDF (ISO 19005) that embeds every font and forbids features that could stop the file displaying correctly in future. Lakehead’s Faculty of Graduate Studies requires it for final theses.',
    link: { label: 'Thesis & Dissertation', hash: 'thesis' },
  },
  {
    id: 'pid',
    term: 'Persistent identifier (PID)',
    aka: ['PID'],
    definition: 'An identifier that keeps pointing to the same thing long-term. DOIs identify outputs such as datasets; ORCID iDs identify people.',
    related: ['doi', 'orcid'],
  },
  {
    id: 'personal-information',
    term: 'Personal information',
    definition: 'Information about an identifiable individual. Removing names alone does not make information non-personal if a person can still be identified from what remains.',
    related: ['direct-identifier', 'indirect-identifier', 'fippa'],
  },
  {
    id: 'phipa',
    term: 'PHIPA',
    definition: 'Ontario’s Personal Health Information Protection Act, 2004. It governs personal health information, including when it is used for research, alongside the REB’s review.',
    related: ['fippa', 'reb'],
  },
  {
    id: 'pipeda',
    term: 'PIPEDA',
    definition: 'Canada’s federal privacy law for private-sector organizations. It generally does not govern research at Ontario universities, where FIPPA (and PHIPA for health data) apply, but its definition of personal information is widely borrowed, including by Lakehead’s classification standard.',
    related: ['fippa', 'personal-information'],
  },
  {
    id: 'pseudonym',
    term: 'Pseudonym',
    definition: 'A substitute label, such as “Participant-7”, used in place of a real name or ID. Data using pseudonyms with a key kept elsewhere is coded data.',
    related: ['coded-data', 're-identification-key'],
  },
  {
    id: 're-identification-key',
    term: 'Re-identification key',
    aka: ['Key file'],
    definition: 'The table linking pseudonyms back to real identities. Keep it separate from the coded data, with stronger protection, and never send the two together.',
    related: ['coded-data', 'pseudonym'],
  },
  {
    id: 'reb',
    term: 'REB',
    aka: ['Research Ethics Board'],
    definition: 'The committee that reviews research involving people before it starts, under TCPS 2. Its approval, and the consent forms it approved, set what you may do with participant data.',
    related: ['tcps-2'],
    link: { label: 'Ethics & DMP resources', hash: 'grants-identifiers' },
  },
  {
    id: 'redaction',
    term: 'Redaction',
    definition: 'Permanently removing sensitive content from a document. Drawing a black box over text is not redaction if the text underneath can still be copied out.',
    link: { label: 'PDF Redaction', hash: 'pdf-redaction' },
  },
  {
    id: 'tcps-2',
    term: 'TCPS 2',
    definition: 'The Tri-Council Policy Statement: Ethical Conduct for Research Involving Humans, currently the 2022 edition. Institutions receiving CIHR, NSERC or SSHRC funding follow it, and REBs apply it.',
    related: ['reb', 'tri-agency'],
  },
  {
    id: 'tri-agency',
    term: 'Tri-Agency',
    definition: 'Canada’s three federal research funding agencies: CIHR (health), NSERC (natural sciences and engineering) and SSHRC (social sciences and humanities). Their joint Research Data Management Policy sets expectations for DMPs and data deposit.',
    related: ['dmp', 'tcps-2'],
    link: { label: 'Tri-Agency RDM Policy', hash: 'tri-agency-policy' },
  },
];

export function getTerm(id) {
  return GLOSSARY.find(t => t.id === id) || null;
}
