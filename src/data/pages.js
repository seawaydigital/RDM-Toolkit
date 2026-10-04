/**
 * Informational (non-tool) routes. Single source for the route set in App.jsx,
 * tab titles / screen-reader announcements, site search and step names in the
 * task bar. Adding a page: add it here, add its component to App.jsx's render
 * list, and add a sidebar link.
 *
 *   hash         — the route (#hash)
 *   title        — document title and announced name
 *   description  — one sentence, shown in search results
 *   keywords     — extra search terms (lower case)
 *   searchable   — false keeps a route out of site search
 */
export const PAGE_META = [
  {
    hash: 'tasks',
    title: 'Common Tasks',
    description: 'Step-by-step routes through the tools for common research jobs, from REB packages to data deposit.',
    keywords: ['workflow', 'how do i', 'steps', 'guide'],
  },
  {
    hash: 'how-this-works',
    title: 'How This Works',
    description: 'How the tools run in your browser, how to check that nothing is uploaded, and where that protection ends.',
    keywords: ['privacy', 'security', 'offline', 'upload', 'trust', 'ai'],
  },
  {
    hash: 'tri-agency-policy',
    title: 'Tri-Agency RDM Policy',
    description: 'What CIHR, NSERC and SSHRC expect for data management plans and data deposit.',
    keywords: ['cihr', 'nserc', 'sshrc', 'dmp', 'data management plan', 'policy', 'ocap'],
  },
  {
    hash: 'grants-identifiers',
    title: 'Grants & Identifiers',
    description: 'ORCID, the tri-agency CV, DOIs, and the REB and DMP essentials for grant applications.',
    keywords: ['orcid', 'ccv', 'doi', 'cv', 'reb', 'grant'],
  },
  {
    hash: 'thesis',
    title: 'Thesis & Dissertation',
    description: 'FGS requirements for your final PDF (PDF/A, unlocked, unsigned), licence and embargo forms, and the data behind your thesis.',
    keywords: ['thesis', 'dissertation', 'graduate', 'fgs', 'pdf/a', 'pdfa', 'embargo', 'knowledge commons', 'masters', 'phd'],
  },
  {
    hash: 'data-classification',
    title: 'Data Classification Tool',
    description: 'Find your data’s classification under Lakehead’s standard (Public, Internal or Confidential) and the controls that apply.',
    keywords: ['classify', 'confidential', 'sensitive', 'internal', 'public', 'security controls'],
  },
  {
    hash: 'storage-calculator',
    title: 'Research Storage Calculator',
    description: 'Estimate storage needs and generate ready-to-paste DMP language.',
    keywords: ['storage', 'backup', 'terabytes', 'dmp', 'estimate'],
  },
  {
    hash: 'lakehead-dataverse',
    title: 'Lakehead Dataverse',
    description: 'Deposit your data in Lakehead’s collection on Borealis, step by step.',
    keywords: ['dataverse', 'borealis', 'deposit', 'repository', 'doi', 'publish data'],
  },
  {
    hash: 'drac-services',
    title: 'DRAC Services',
    description: 'National computing, cloud, storage and data services from the Digital Research Alliance of Canada.',
    keywords: ['alliance', 'compute canada', 'cluster', 'hpc', 'cloud', 'globus', 'frdr'],
  },
  {
    hash: 'acrobat-alternative',
    title: 'Adobe Acrobat Alternative',
    description: 'Free ways to do what Acrobat Pro does, and where Pro is still the better choice.',
    keywords: ['adobe', 'acrobat', 'pdf editor', 'ocr', 'free'],
  },
  {
    hash: 'request-a-tool',
    title: 'Request a Tool',
    description: 'Suggest a tool, and see why some tools cannot work in a browser.',
    keywords: ['suggest', 'feature request', 'feedback'],
  },
  {
    hash: 'accessibility',
    title: 'Accessibility Statement',
    description: 'How the site is tested for accessibility, known limits, and how to report a barrier.',
    keywords: ['aoda', 'wcag', 'screen reader', 'accessibility'],
  },
];

export const PAGE_IDS = new Set(PAGE_META.map(p => p.hash));

export function getPageMeta(hash) {
  return PAGE_META.find(p => p.hash === hash) || null;
}
