// Single source of truth for institution-specific strings. Update here and all
// pages pick up the change. Everything is Lakehead University (Thunder Bay, ON)
// unless a page overrides a field locally.

export const INSTITUTION = {
  name: 'Lakehead University',
  shortName: 'Lakehead',
  acronym: 'LU',

  // General Research Data Management contact — used by RequestATool,
  // DataClassification, TriAgencyPolicy, DRACServices.
  rdmEmail: 'rdm.research@lakeheadu.ca',
  researchOffice: 'Office of Research Services',

  // Storage Calculator uses a slightly different mailbox alias.
  storageEmail: 'rdm@lakeheadu.ca',

  // Library / data-deposit contact — used by LakeheadDataverse and the new
  // Grants & Identifiers page.
  dataLibrarian: {
    name: 'Dr. Philips Ayeni',
    title: 'Scholarly Communications & Data Services Librarian',
    email: 'payeni1@lakeheadu.ca',
  },

  // Institutional resources linked from multiple pages.
  libraryDataGuideUrl: 'https://libguides.lakeheadu.ca/c.php?g=613282&p=4276405',
  dataverseUrl: 'https://borealisdata.ca/dataverse/lakehead',

  // Indigenous Research Support Office — referenced on Tri-Agency Policy page.
  indigenousResearchOffice: "Lakehead's Indigenous Research Support Office",

  // Research Ethics Board — used by Grants & Identifiers page.
  rebContactUrl: 'https://www.lakeheadu.ca/research-and-innovation/research-services/research-ethics',
};

// Helper: pre-built mailto: hrefs so callers don't concatenate strings.
export const MAILTO = {
  rdm: `mailto:${INSTITUTION.rdmEmail}`,
  storage: `mailto:${INSTITUTION.storageEmail}`,
  dataLibrarian: `mailto:${INSTITUTION.dataLibrarian.email}`,
};
