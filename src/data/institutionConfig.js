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

// Single source of truth for project, source-code and sister-site URLs.
//
// Two separate concerns live here, both of which outlive any one maintainer:
//   - repoUrl / sourceBaseUrl back the site's trust claim ("don't take our word
//     for it — read the source"). If the repository is transferred or mirrored,
//     change it here and every link in the app follows.
//   - rsToolkitUrl / rsCybersecurityGuideUrl point at the sister Research
//     Security site, which is hosted separately. Whoever hosts RDM Toolkit does
//     not necessarily control those domains — keeping them here makes that
//     dependency obvious rather than buried in a component.
export const PROJECT = {
  repoUrl: 'https://github.com/seawaydigital/RDM-Toolkit',
  sourceBaseUrl: 'https://github.com/seawaydigital/RDM-Toolkit/blob/master/',
  rsToolkitUrl: 'https://rs.rdmtoolkit.ca',
  rsCybersecurityGuideUrl: 'https://seawaydigital.github.io/RSToolkit/#cybersecurity-guide',
};
