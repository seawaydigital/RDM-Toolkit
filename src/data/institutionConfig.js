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

  // The standard the Data Classification wizard implements. Use this title
  // verbatim everywhere it is cited — it is the document's own cover title.
  dataClassificationStandard: {
    title: 'Research Data Guidelines and Classification Standard',
    date: 'March 2024',
    url: 'https://www.lakeheadu.ca/sites/default/files/profile-data/swright/Lakehead%20University%20-%20Research%20Data%20Classification%20Guidelines%20and%20Standard%20-%20Final%20(27.03.2024).pdf',
  },

  // Faculty of Graduate Studies — thesis/dissertation submission. Used by the
  // Thesis & Dissertation page. Requirements quoted there come from the two
  // process pages and the Embargo Procedure (10 November 2023).
  graduateStudies: {
    name: 'Faculty of Graduate Studies',
    homeUrl: 'https://www.lakeheadu.ca/programs/graduate',
    thesisProcessUrl: 'https://www.lakeheadu.ca/programs/graduate/academic-information/degree-completion/thesis',
    dissertationProcessUrl: 'https://www.lakeheadu.ca/programs/graduate/academic-information/degree-completion/dissertation',
    licenceFormUrl: 'https://www.lakeheadu.ca/sites/default/files/uploads/56/Thesis-Licence-Library-LU-March%2019-15-rev-%281%29.pdf',
    embargoFormUrl: 'https://www.lakeheadu.ca/sites/default/files/profile-data/tmlaught/Thesis%20Embargo%20Form%20%28Optional%29.pdf',
    embargoProcedureUrl: 'https://www.lakeheadu.ca/sites/default/files/profile-data/tmlaught/Embargo%20Procedure.pdf',
  },

  // Lakehead's institutional repository; holds theses and dissertations from 2009 on.
  knowledgeCommonsUrl: 'https://knowledgecommons.lakeheadu.ca/',

  // Research Ethics Board — used by Grants & Identifiers page.
  rebContactUrl: 'https://www.lakeheadu.ca/research-and-innovation/ethics/human-subjects',
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
