import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Info, ChevronLeft, ChevronRight, Printer, Copy, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';

/* ============================================================
   CONSTANTS
   ============================================================ */

const TIERS = {
  public: {
    label: 'Public',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.4)',
    icon: ShieldCheck,
    definition: 'Data deemed public by legislation or University policy. Unauthorized disclosure would result in no harm to an individual or the University.',
  },
  internal: {
    label: 'Internal / Private',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
    icon: ShieldAlert,
    definition: 'Data available to authorized users for research purposes. Unauthorized disclosure could result in minor harm to an individual or the University.',
  },
  confidential: {
    label: 'Confidential / Sensitive',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: ShieldX,
    definition: 'Data only available to limited authorized individuals. Unauthorized disclosure could result in severe harm to an individual or the University.',
  },
};

const CONTROLS = {
  confidential: {
    'Electronic Storage': 'University-provided devices/systems and authorized SaaS only. Removable media must be encrypted.',
    'Physical Storage': 'Locked container; key accessible only to PI.',
    'Backups': 'Encrypted and password protected.',
    'Email Transmission': 'Not permitted. If exception granted: encrypted, Email Disclaimer included, "Confidential" in subject line.',
    'File Sharing': 'Secure/authorized means approved by IT. Removable media must be encrypted. Named recipients only.',
    'Physical Transmission': 'Tamper-evident packaging. Label "Confidential". Reproduce sensitivity level.',
    'Access Provisioning': 'Need-to-know basis; least privilege; PI approval required.',
    'Access Monitoring': 'Quarterly review of access list.',
    'Deprovisioning': 'Immediate revocation for terminated members; inactive accounts disabled within 90 days.',
    'Remote Access': 'No copying/moving/downloading to local drives or removable media without PI authorization.',
    'Retention': 'Minimum 7 years post-completion (LUFA CA); longer if contractual agreements require.',
    'Hardcopy Disposal': 'Shred; certificate of destruction if outsourced.',
    'Electronic Disposal': 'Destroy (including backups) so data cannot be recovered; certificate of destruction if outsourced.',
    'Device Disposal': 'Return to Facilities; full destruction of storage media.',
    'Consent': 'Voluntary and informed consent required. Express consent for secondary use of identifiable data.',
    'Training': 'Required for all research team members handling Confidential data.',
    'Audit Logs': 'Required. Retain 1 year (2 months immediately available). Review on suspected incident.',
    'Vulnerability Scanning': 'Monthly. Rescan after significant changes or post-remediation. Report breaches to Risk Management and IT.',
    'Breach Reporting': 'Report to ORS. Escalate to Director of Risk Management and Director of Technology Services.',
  },
  internal: {
    'Electronic Storage': 'University-provided devices/systems and authorized SaaS.',
    'Physical Storage': 'Reasonable precautions; restrict display.',
    'Backups': 'No specific standard.',
    'Email Transmission': 'Email Disclaimer required.',
    'File Sharing': 'Internal systems approved by IT (SharePoint, OneDrive). Named recipients only.',
    'Physical Transmission': 'Sealed envelope.',
    'Access Provisioning': 'As needed; PI approval.',
    'Access Monitoring': 'Quarterly review of access list.',
    'Deprovisioning': 'Inactive accounts disabled within 90 days.',
    'Remote Access': 'No specific standard.',
    'Retention': 'Minimum 7 years post-completion (LUFA CA).',
    'Hardcopy Disposal': 'Shred or secure recycling.',
    'Electronic Disposal': 'Delete.',
    'Device Disposal': 'Return to Facilities.',
    'Consent': 'No specific standard.',
    'Training': 'Required.',
    'Audit Logs': 'Required. Same retention as Confidential.',
    'Vulnerability Scanning': 'Monthly.',
    'Breach Reporting': 'No specific standard.',
  },
  public: {
    'Electronic Storage': 'No specific standard.',
    'Physical Storage': 'No specific standard.',
    'Backups': 'No specific standard.',
    'Email Transmission': 'No specific standard.',
    'File Sharing': 'No specific standard.',
    'Physical Transmission': 'No specific standard.',
    'Access Provisioning': 'No specific standard.',
    'Access Monitoring': 'No specific standard.',
    'Deprovisioning': 'No specific standard.',
    'Remote Access': 'No specific standard.',
    'Retention': 'No specific standard.',
    'Hardcopy Disposal': 'Any method.',
    'Electronic Disposal': 'Delete.',
    'Device Disposal': 'Return to Facilities.',
    'Consent': 'No specific standard.',
    'Training': 'No specific standard.',
    'Audit Logs': 'Not required.',
    'Vulnerability Scanning': 'No specific standard.',
    'Breach Reporting': 'No specific standard.',
  },
};

const CONTROL_CATEGORIES = [
  { heading: 'Storage', keys: ['Electronic Storage', 'Physical Storage', 'Backups'] },
  { heading: 'Transmission', keys: ['Email Transmission', 'File Sharing', 'Physical Transmission'] },
  { heading: 'Access', keys: ['Access Provisioning', 'Access Monitoring', 'Deprovisioning', 'Remote Access'] },
  { heading: 'Retention & Disposal', keys: ['Retention', 'Hardcopy Disposal', 'Electronic Disposal', 'Device Disposal'] },
  { heading: 'Other Controls', keys: ['Consent', 'Training', 'Audit Logs', 'Vulnerability Scanning', 'Breach Reporting'] },
];

const DIRECT_IDENTIFIERS = [
  'Full name',
  'Date of birth',
  'Home address',
  'Health card number',
  'Social Insurance Number (SIN)',
  'Email address or phone number',
  'Photographs, video, or audio recordings',
];

const SENSITIVE_CATEGORIES = [
  'Sexual orientation or gender identity',
  'Health or medical information',
  'Mental health information',
  'Genetic or biometric data',
  'Financial information',
  'Ethnic or racial origin',
];

const NON_HUMAN_OPTIONS = [
  { value: 'ip', label: 'Intellectual property or trade secrets', tier: 'confidential' },
  { value: 'unpublished', label: 'Unpublished research data', tier: 'confidential' },
  { value: 'working', label: 'Working documents or contracts', tier: 'internal' },
  { value: 'published', label: 'Published data', tier: 'public' },
];

/* ============================================================
   QUESTION DEFINITIONS
   ============================================================ */

const QUESTIONS = [
  {
    key: 'publiclyAvailable',
    stepLabel: 'Public Data',
    title: 'Is your data publicly available?',
    description: 'Data that has already been published, released under open licence, or is otherwise freely accessible to anyone.',
    tooltip: 'Examples include published datasets in open repositories, government open data, publicly available census data, or data already shared in academic publications.',
    type: 'radio',
    options: [
      { value: 'yes', label: 'Yes — the data is already publicly available' },
      { value: 'no', label: 'No — the data is not publicly available' },
    ],
  },
  {
    key: 'humanParticipants',
    stepLabel: 'Human Data',
    title: 'Does your research involve data from human participants?',
    description: 'This includes any data collected from or about living individuals, whether through surveys, interviews, observations, medical records, or other means.',
    tooltip: 'Human participant data is governed by the Tri-Council Policy Statement: Ethical Conduct for Research Involving Humans (TCPS 2, 2022). If your research required Research Ethics Board (REB) approval, the answer is likely "Yes".',
    type: 'radio',
    options: [
      { value: 'yes', label: 'Yes — data involves human participants' },
      { value: 'no', label: 'No — data does not involve human participants' },
    ],
  },
  {
    key: 'directIdentifiers',
    stepLabel: 'Identifiers',
    title: 'Does the data contain any direct identifiers?',
    description: 'Direct identifiers are data elements that can be used on their own to identify a specific individual. Select all that apply.',
    tooltip: 'Even a single direct identifier means the data could be linked to a specific person. Under PIPEDA and PHIPA, this data requires the highest level of protection.',
    type: 'checkbox',
    options: DIRECT_IDENTIFIERS.map(d => ({ value: d, label: d })),
  },
  {
    key: 'sensitiveInfo',
    stepLabel: 'Sensitivity',
    title: 'Does the data contain sensitive personal information?',
    description: 'Sensitive personal information relates to characteristics or conditions that could cause harm or discrimination if disclosed. Select all that apply.',
    tooltip: 'These categories are considered sensitive under Canadian and international privacy legislation. Their disclosure could lead to discrimination, stigmatization, or psychological harm.',
    type: 'checkbox',
    options: SENSITIVE_CATEGORIES.map(s => ({ value: s, label: s })),
  },
  {
    key: 'deidentification',
    stepLabel: 'De-identification',
    title: 'What is the de-identification status of your human participant data?',
    description: 'Consider whether individuals could be re-identified by combining your dataset with other available information.',
    tooltip: 'De-identified data has had direct identifiers removed but may still allow re-identification through indirect means (e.g., combining age + postal code + gender). Truly anonymized data has no reasonable path to re-identification.',
    type: 'radio',
    options: [
      { value: 'reidentifiable', label: 'De-identified, but re-identification is possible or uncertain' },
      { value: 'anonymized', label: 'Truly anonymized — no reasonable path to re-identification' },
      { value: 'other', label: 'Human participant data that does not fall into the above categories' },
    ],
  },
  {
    key: 'nonHumanType',
    stepLabel: 'Data Type',
    title: 'What type of non-human-participant data is this?',
    description: 'Select the category that best describes your research data.',
    type: 'radio',
    options: NON_HUMAN_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    key: 'harmLevel',
    stepLabel: 'Harm Level',
    title: 'If this data were disclosed without authorization, how severe would the potential harm be?',
    description: 'Consider both the magnitude of harm and the probability that it would occur, as outlined in TCPS 2 (2022).',
    tooltip: 'Severe harm includes: identity theft, physical danger, significant financial loss, damage to reputation or career, legal liability, or harm to vulnerable populations. Minor harm includes: inconvenience, temporary embarrassment, or minor financial cost.',
    type: 'radio',
    options: [
      { value: 'severe', label: 'Severe — could cause significant harm to individuals or the University' },
      { value: 'minor', label: 'Minor — could cause some inconvenience or minor harm' },
      { value: 'none', label: 'None — disclosure would cause no harm' },
    ],
  },
  {
    key: 'thirdParty',
    stepLabel: 'Third-Party',
    title: 'Does your dataset include data from or shared with a third party?',
    description: 'Third-party data includes datasets received from external organizations, government agencies, industry partners, or other institutions, as well as data you plan to share externally.',
    tooltip: 'Under the Lakehead Data Classification Standard (s. 4.2.4), third-party data sharing requires a formal Data Sharing Agreement. Confidential data additionally requires a Non-Disclosure Agreement (NDA).',
    type: 'radio',
    options: [
      { value: 'yes', label: 'Yes — data is from or will be shared with a third party' },
      { value: 'no', label: 'No — no third-party involvement' },
    ],
  },
  {
    key: 'indigenous',
    stepLabel: 'Indigenous',
    title: 'Does your research involve Indigenous communities, peoples, or data?',
    description: 'This includes research conducted with or about First Nations, Inuit, or Métis communities, or data that relates to Indigenous knowledge, culture, or governance.',
    tooltip: 'The First Nations principles of OCAP® (Ownership, Control, Access, and Possession) apply to research involving First Nations data. Divergences from OCAP® must be resolved with the Office of Research Services before project commencement (s. 2.0 of the Lakehead Data Classification Standard).',
    type: 'radio',
    options: [
      { value: 'yes', label: 'Yes — involves Indigenous communities or data' },
      { value: 'no', label: 'No — does not involve Indigenous communities or data' },
    ],
  },
];

/* ============================================================
   DECISION ENGINE
   ============================================================ */

function computeClassification(answers) {
  let tier = null;
  const warnings = [];
  let consentNote = false;

  // Step 1: Publicly available
  if (answers.publiclyAvailable === 'yes') {
    tier = 'public';
  }

  // Step 2-5: Human participants branch
  if (tier === null && answers.humanParticipants === 'yes') {
    // Direct identifiers
    if (answers.directIdentifiers && answers.directIdentifiers.length > 0) {
      tier = 'confidential';
    }
    // Sensitive info
    else if (answers.sensitiveInfo && answers.sensitiveInfo.length > 0) {
      tier = 'confidential';
    }
    // De-identification
    else if (answers.deidentification === 'reidentifiable') {
      tier = 'confidential';
    } else if (answers.deidentification === 'anonymized') {
      tier = 'public';
      consentNote = true;
    } else if (answers.deidentification === 'other') {
      tier = 'internal';
    }
  }

  // Step 6: Non-human branch
  if (tier === null && answers.humanParticipants === 'no') {
    const opt = NON_HUMAN_OPTIONS.find(o => o.value === answers.nonHumanType);
    if (opt) tier = opt.tier;
  }

  // Fallback
  if (!tier) tier = 'internal';

  // Step 7: Harm override (can only upgrade)
  if (answers.harmLevel === 'severe' && tier !== 'confidential') {
    tier = 'confidential';
    warnings.push('Classification was elevated to Confidential because unauthorized disclosure could cause severe harm.');
  }

  // Step 8: Third-party data
  if (answers.thirdParty === 'yes') {
    if (tier === 'public') {
      tier = 'internal';
      warnings.push('Classification was elevated from Public to Internal because third-party data is involved.');
    }
    warnings.push('A formal Data Sharing Agreement is required (s. 4.2.4 of the Data Classification Standard).');
    warnings.push('Retain one copy of shared data for a minimum of 7 years (s. 5.2 Data Retention).');
    if (tier === 'confidential') {
      warnings.push('A Non-Disclosure Agreement (NDA) is required for sharing Confidential data with third parties.');
    }
  }

  // Consent note for anonymized data
  if (consentNote) {
    warnings.push('This classification assumes that research participants were informed their anonymized data would be made public through dissemination.');
  }

  // Step 9: Indigenous research
  if (answers.indigenous === 'yes') {
    warnings.push('OCAP® principles (Ownership, Control, Access, and Possession) apply to this research. Any divergences from OCAP® must be resolved with the Office of Research Services (ORS) before project commencement (s. 2.0).');
  }

  return { tier, warnings };
}

/* ============================================================
   STEP FLOW ENGINE
   ============================================================ */

// Returns the question index for a given logical step, given the answers so far
function getNextQuestionIndex(currentIndex, answers) {
  switch (currentIndex) {
    case 0: // publiclyAvailable
      if (answers.publiclyAvailable === 'yes') return 6; // skip to harm
      return 1;
    case 1: // humanParticipants
      if (answers.humanParticipants === 'yes') return 2; // identifiers
      return 5; // non-human type
    case 2: // directIdentifiers
      if (answers.directIdentifiers && answers.directIdentifiers.length > 0) return 6; // harm
      return 3; // sensitive
    case 3: // sensitiveInfo
      if (answers.sensitiveInfo && answers.sensitiveInfo.length > 0) return 6; // harm
      return 4; // de-identification
    case 4: // deidentification
      return 6; // harm
    case 5: // nonHumanType
      return 6; // harm
    case 6: // harmLevel
      return 7; // third-party
    case 7: // thirdParty
      return 8; // indigenous
    case 8: // indigenous
      return -1; // done → show result
    default:
      return -1;
  }
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function ProgressBar({ currentIndex, visitedIndices, totalSteps }) {
  return (
    <div className="dc-progress">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isActive = i === currentIndex;
        const isVisited = visitedIndices.includes(i);
        return (
          <div key={i} className="dc-progress-item">
            {i > 0 && <div className={`dc-progress-line ${isVisited || isActive ? 'dc-progress-line--done' : ''}`} />}
            <div className={`dc-progress-dot ${isActive ? 'dc-progress-dot--active' : isVisited ? 'dc-progress-dot--done' : ''}`}>
              {isVisited && !isActive ? <Check size={12} /> : i + 1}
            </div>
          </div>
        );
      })}
      <div className="dc-progress-text">
        Step {currentIndex + 1} of {totalSteps}
      </div>
    </div>
  );
}

function TooltipPanel({ text, isOpen, onToggle }) {
  if (!text) return null;
  return (
    <div className="dc-tooltip-wrapper">
      <button className="dc-tooltip-toggle" onClick={onToggle} type="button" aria-expanded={isOpen}>
        <Info size={16} />
        {isOpen ? 'Hide explanation' : 'More information'}
      </button>
      {isOpen && (
        <div className="dc-tooltip-content">
          {text}
        </div>
      )}
    </div>
  );
}

function ControlsTable({ tier }) {
  const controls = CONTROLS[tier];
  if (!controls) return null;

  return (
    <div className="dc-controls">
      <h3 className="dc-section-title">Required Security Controls</h3>
      <p className="dc-section-desc">
        Based on the Lakehead University Research Data Classification Standard, the following controls apply to <strong>{TIERS[tier].label}</strong> data:
      </p>
      {CONTROL_CATEGORIES.map(cat => (
        <div key={cat.heading} className="dc-controls-group">
          <h4 className="dc-controls-heading">{cat.heading}</h4>
          <div className="dc-controls-list">
            {cat.keys.map(key => (
              <div key={key} className="dc-controls-row">
                <span className="dc-controls-label">{key}</span>
                <span className="dc-controls-value" style={{
                  color: controls[key] === 'No specific standard.' || controls[key] === 'Not required.'
                    ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {controls[key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WarningsPanel({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="dc-warnings">
      <h3 className="dc-section-title" style={{ color: 'var(--accent-amber)' }}>
        <ShieldAlert size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Important Notices
      </h3>
      <ul className="dc-warnings-list">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

function AnswersSummary({ answers, questionIndices }) {
  const [open, setOpen] = useState(false);

  const formatAnswer = (key, value) => {
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None selected';
    const q = QUESTIONS.find(q => q.key === key);
    if (q) {
      const opt = q.options.find(o => o.value === value);
      if (opt) return opt.label;
    }
    return String(value);
  };

  return (
    <div className="dc-answers">
      <button className="dc-answers-toggle" onClick={() => setOpen(!open)} type="button">
        <span>Your Answers</span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      <div className="dc-answers-list" style={open ? undefined : { display: 'none' }}>
        {questionIndices.map(idx => {
          const q = QUESTIONS[idx];
          const val = answers[q.key];
          if (val === undefined) return null;
          return (
            <div key={q.key} className="dc-answers-row">
              <span className="dc-answers-question">{q.title}</span>
              <span className="dc-answers-value">{formatAnswer(q.key, val)}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function DataClassification() {
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = welcome
  const [answers, setAnswers] = useState({});
  const [stepHistory, setStepHistory] = useState([]);
  const [result, setResult] = useState(null); // { tier, warnings }
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const titleRef = useRef(null);

  // Current question
  const question = currentIndex >= 0 && currentIndex < QUESTIONS.length ? QUESTIONS[currentIndex] : null;
  const currentAnswer = question ? answers[question.key] : undefined;

  // Check if current answer is valid for proceeding
  const canProceed = (() => {
    if (!question) return false;
    if (question.type === 'checkbox') return true; // checkboxes can be empty (means "none")
    return currentAnswer !== undefined && currentAnswer !== null;
  })();

  // Focus title on step change
  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
    setTooltipOpen(false);
  }, [currentIndex]);

  const handleAnswer = useCallback((value) => {
    if (!question) return;
    if (question.type === 'checkbox') {
      setAnswers(prev => {
        const existing = prev[question.key] || [];
        const next = existing.includes(value)
          ? existing.filter(v => v !== value)
          : [...existing, value];
        return { ...prev, [question.key]: next };
      });
    } else {
      setAnswers(prev => ({ ...prev, [question.key]: value }));
    }
  }, [question]);

  const handleNext = useCallback(() => {
    if (!question) return;
    const updatedAnswers = { ...answers };
    // For checkbox questions with no selections, store empty array
    if (question.type === 'checkbox' && !updatedAnswers[question.key]) {
      updatedAnswers[question.key] = [];
      setAnswers(updatedAnswers);
    }

    const nextIdx = getNextQuestionIndex(currentIndex, updatedAnswers);

    if (nextIdx === -1) {
      // Compute result
      const { tier, warnings } = computeClassification(updatedAnswers);
      setResult({ tier, warnings });
      setStepHistory(prev => [...prev, currentIndex]);
    } else {
      setStepHistory(prev => [...prev, currentIndex]);
      setCurrentIndex(nextIdx);
    }
  }, [question, answers, currentIndex]);

  const handleBack = useCallback(() => {
    if (result) {
      setResult(null);
      setCurrentIndex(stepHistory[stepHistory.length - 1] ?? -1);
      setStepHistory(prev => prev.slice(0, -1));
      return;
    }
    if (stepHistory.length > 0) {
      const prevIdx = stepHistory[stepHistory.length - 1];
      setStepHistory(prev => prev.slice(0, -1));
      setCurrentIndex(prevIdx);
    } else {
      setCurrentIndex(-1);
    }
  }, [result, stepHistory]);

  const handleStartOver = useCallback(() => {
    setCurrentIndex(-1);
    setAnswers({});
    setStepHistory([]);
    setResult(null);
    setCopied(false);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const tier = TIERS[result.tier];
    const controls = CONTROLS[result.tier];
    const date = new Date().toLocaleDateString('en-CA');

    let text = `RESEARCH DATA CLASSIFICATION RESULT\n`;
    text += `Date: ${date}\n`;
    text += `Classification: ${tier.label.toUpperCase()}\n\n`;
    text += `${tier.definition}\n\n`;
    text += `REQUIRED CONTROLS\n${'='.repeat(50)}\n`;

    for (const cat of CONTROL_CATEGORIES) {
      text += `\n${cat.heading}\n${'-'.repeat(30)}\n`;
      for (const key of cat.keys) {
        text += `  ${key}: ${controls[key]}\n`;
      }
    }

    if (result.warnings.length > 0) {
      text += `\nIMPORTANT NOTICES\n${'='.repeat(50)}\n`;
      result.warnings.forEach(w => { text += `  • ${w}\n`; });
    }

    text += `\n---\nGenerated by RDM Toolkit — Lakehead University\n`;
    text += `Based on the Lakehead University Research Data Classification Guidelines and Standard\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  // All visited question indices (for answers summary)
  const allVisited = result ? [...stepHistory, ...(currentIndex >= 0 ? [currentIndex] : [])] : stepHistory;

  /* ---- WELCOME VIEW ---- */
  if (currentIndex === -1 && !result) {
    return (
      <div className="htw dc-page">
        <div className="htw-hero">
          <div className="htw-kicker">Guided assessment</div>
          <h1 className="htw-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ShieldCheck size={32} style={{ color: 'var(--accent-primary)' }} />
            Data Classification Tool
          </h1>
          <p className="htw-subtitle">
            Determine the correct classification level for your research data
          </p>
        </div>

        <section className="dc-welcome-card">
          <h2>What is Data Classification?</h2>
          <p>
            Lakehead University requires that all research data be classified into one of three tiers based on the
            potential harm that could result from unauthorized disclosure. This tool will guide you through a series
            of questions to determine the appropriate classification for your data.
          </p>

          <div className="dc-tier-preview">
            {Object.entries(TIERS).reverse().map(([key, tier]) => (
              <div key={key} className="dc-tier-card" style={{ borderLeftColor: tier.color, background: tier.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <tier.icon size={20} style={{ color: tier.color }} />
                  <strong style={{ color: tier.color }}>{tier.label}</strong>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{tier.definition}</p>
              </div>
            ))}
          </div>

          <div className="dc-welcome-notes">
            <p><strong>Important notes:</strong></p>
            <ul>
              <li>This tool is for guidance only and does not replace consultation with the Office of Research Services (ORS).</li>
              <li>A single classification level should be assigned to a collection of data that is common in purpose or function.</li>
              <li>Combining multiple lower-risk data elements can increase the overall classification level.</li>
              <li>No data is stored — all processing happens in your browser and is lost when you close the page.</li>
            </ul>
          </div>

          <button className="action-button" onClick={() => setCurrentIndex(0)} style={{ maxWidth: 320, margin: '0 auto' }}>
            Begin Assessment <ChevronRight size={18} />
          </button>
        </section>
      </div>
    );
  }

  /* ---- RESULT VIEW ---- */
  if (result) {
    const tier = TIERS[result.tier];
    const TierIcon = tier.icon;

    return (
      <div className="htw dc-page dc-print-area">
        <div className="dc-print-header">
          <p>Lakehead University — Research Data Classification Result</p>
          <p>{new Date().toLocaleDateString('en-CA')}</p>
        </div>

        <h2 className="dc-result-heading">Classification Result</h2>

        <div className="dc-result-badge" style={{ borderColor: tier.border, background: tier.bg }}>
          <TierIcon size={48} style={{ color: tier.color }} />
          <h3 className="dc-result-label" style={{ color: tier.color }}>{tier.label}</h3>
          <p className="dc-result-def">{tier.definition}</p>
        </div>

        <WarningsPanel warnings={result.warnings} />
        <ControlsTable tier={result.tier} />
        <AnswersSummary answers={answers} questionIndices={allVisited.filter(i => i >= 0)} />

        <div className="dc-actions">
          <button className="dc-action-btn dc-action-btn--primary" onClick={handlePrint}>
            <Printer size={16} /> Print Results
          </button>
          <button className="dc-action-btn dc-action-btn--secondary" onClick={handleCopy}>
            {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy as Text</>}
          </button>
          <button className="dc-action-btn dc-action-btn--ghost" onClick={handleBack}>
            <ChevronLeft size={16} /> Edit Answers
          </button>
          <button className="dc-action-btn dc-action-btn--ghost" onClick={handleStartOver}>
            <RotateCcw size={16} /> Start Over
          </button>
        </div>

        <div className="dc-disclaimer">
          <p>
            This classification is based on the <em>Lakehead University Research Data Guidelines and Classification Standard</em> (March 2024).
            For complex cases or questions, contact the {INSTITUTION.researchOffice} at{' '}
            <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>.
          </p>
        </div>
      </div>
    );
  }

  /* ---- WIZARD STEP VIEW ---- */
  return (
    <div className="htw dc-page">
      <ProgressBar
        currentIndex={currentIndex}
        visitedIndices={stepHistory}
        totalSteps={QUESTIONS.length}
      />

      <div className="dc-card" key={currentIndex}>
        <div className="dc-card-header">
          <span className="dc-step-badge">{question.stepLabel}</span>
          <h2 className="dc-question-title" ref={titleRef} tabIndex={-1}>
            {question.title}
          </h2>
          <p className="dc-question-desc">{question.description}</p>
        </div>

        <TooltipPanel
          text={question.tooltip}
          isOpen={tooltipOpen}
          onToggle={() => setTooltipOpen(o => !o)}
        />

        <div className="dc-options" role={question.type === 'radio' ? 'radiogroup' : 'group'} aria-labelledby="dc-question-title">
          {question.options.map(opt => {
            const isSelected = question.type === 'checkbox'
              ? (currentAnswer || []).includes(opt.value)
              : currentAnswer === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                className={`dc-option ${isSelected ? 'dc-option--selected' : ''}`}
                onClick={() => handleAnswer(opt.value)}
                role={question.type === 'radio' ? 'radio' : 'checkbox'}
                aria-checked={isSelected}
              >
                <span className={`dc-option-indicator ${question.type === 'checkbox' ? 'dc-option-indicator--check' : ''}`}>
                  {isSelected && <Check size={14} />}
                </span>
                <span className="dc-option-label">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {question.type === 'checkbox' && (
          <p className="dc-checkbox-hint">
            Select all that apply. If none apply, click "Next" to continue.
          </p>
        )}

        <div className="dc-nav">
          <button className="dc-nav-back" onClick={handleBack} type="button">
            <ChevronLeft size={16} /> Back
          </button>
          <button
            className="dc-nav-next"
            onClick={handleNext}
            disabled={!canProceed && question.type !== 'checkbox'}
            type="button"
          >
            {currentIndex === QUESTIONS.length - 1 ? 'See Result' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
