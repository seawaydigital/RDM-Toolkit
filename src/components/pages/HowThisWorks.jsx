import { Shield, WifiOff, Wifi, Eye, FileCheck, Lock, Globe, MonitorSmartphone, ArrowRight, ArrowDown, CheckCircle, XCircle, Laptop, ExternalLink } from 'lucide-react';

export default function HowThisWorks() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <h1 className="htw-title">How RDM Toolkit Works</h1>
        <p className="htw-subtitle">
          A plain-language explanation of why your files are safe here.
        </p>
      </div>

      {/* The Core Promise */}
      <section className="htw-section">
        <div className="htw-promise">
          <Shield size={32} />
          <div>
            <h2>The Short Version</h2>
            <p>
              Your files never leave your computer. When you use RDM Toolkit, everything
              happens right here in your browser — the same way a calculator app works
              on your phone. No file is ever uploaded to a server. No one else can see
              what you're working on. When you close the tab, it's gone.
            </p>
          </div>
        </div>
      </section>

      {/* Visual step-by-step */}
      <section className="htw-section">
        <h2 className="htw-section-title">What Happens When You Use a Tool</h2>
        <p className="htw-section-intro">
          Here is exactly what happens, step by step, when you process a file with RDM Toolkit:
        </p>
        <div className="htw-diagram">
          <div className="htw-diagram-step">
            <span className="htw-diagram-step-number">1</span>
            <span className="htw-diagram-step-text">
              You select a file from your computer
            </span>
          </div>
          <ArrowDown size={20} className="htw-diagram-arrow" />
          <div className="htw-diagram-step">
            <span className="htw-diagram-step-number">2</span>
            <span className="htw-diagram-step-text">
              Your browser reads the file into its own memory
            </span>
          </div>
          <ArrowDown size={20} className="htw-diagram-arrow" />
          <div className="htw-diagram-step">
            <span className="htw-diagram-step-number">3</span>
            <span className="htw-diagram-step-text">
              The tool processes the file entirely on your device
            </span>
          </div>
          <ArrowDown size={20} className="htw-diagram-arrow" />
          <div className="htw-diagram-step">
            <span className="htw-diagram-step-number">4</span>
            <span className="htw-diagram-step-text">
              You download the result — still on your computer
            </span>
          </div>
          <div className="htw-diagram-badge">
            <CheckCircle size={16} />
            <span>Zero network transmissions. Zero copies on external servers.</span>
          </div>
        </div>
      </section>

      {/* How typical sites work vs RDM Toolkit */}
      <section className="htw-section">
        <h2 className="htw-section-title">What Makes This Different</h2>
        <p className="htw-section-intro">
          Most file conversion websites work by uploading your file to their servers,
          processing it there, and sending the result back. That means a copy of your
          file sits on someone else's computer — sometimes for hours, sometimes permanently.
        </p>

        <div className="htw-comparison">
          <div className="htw-comparison-card htw-comparison-card--bad">
            <div className="htw-comparison-header">
              <Wifi size={20} />
              <h3>Typical Conversion Sites</h3>
            </div>
            <ol className="htw-comparison-steps">
              <li>You upload your file to their server</li>
              <li>Their server processes your file</li>
              <li>They send the result back to you</li>
              <li>Your original file stays on their server</li>
            </ol>
            <div className="htw-comparison-verdict">
              <XCircle size={16} />
              <span>Your file leaves your control</span>
            </div>
          </div>

          <div className="htw-comparison-arrow">
            <ArrowRight size={24} />
          </div>

          <div className="htw-comparison-card htw-comparison-card--good">
            <div className="htw-comparison-header">
              <Laptop size={20} />
              <h3>RDM Toolkit</h3>
            </div>
            <ol className="htw-comparison-steps">
              <li>You select your file</li>
              <li>Your browser processes it locally</li>
              <li>The result appears on your screen</li>
              <li>Nothing is sent anywhere</li>
            </ol>
            <div className="htw-comparison-verdict htw-comparison-verdict--good">
              <CheckCircle size={16} />
              <span>Your file never leaves your device</span>
            </div>
          </div>
        </div>
      </section>

      {/* What "runs in your browser" means */}
      <section className="htw-section">
        <h2 className="htw-section-title">What "Runs in Your Browser" Actually Means</h2>
        <p className="htw-section-intro">
          You might be wondering: if nothing is uploaded, how does the tool actually work?
        </p>
        <div className="htw-promise">
          <Laptop size={32} />
          <div>
            <p>
              Modern web browsers (Chrome, Firefox, Safari, Edge) are powerful enough to
              do real work — compressing images, merging PDFs, encrypting files, and more —
              all by themselves, without sending anything over the internet.
            </p>
            <p style={{ marginTop: '12px' }}>
              Think of it like this: when you use a calculator on your phone, the math
              happens on your phone. It doesn't send your numbers to a server and wait
              for an answer. RDM Toolkit works the same way — except instead of math, it's
              doing file operations.
            </p>
            <p style={{ marginTop: '12px' }}>
              The code that powers each tool is downloaded once when you first open the
              page (just like any website loads its code). After that, all the actual
              file processing happens using your computer's processor and memory. Your
              internet connection is not involved.
            </p>
          </div>
        </div>
      </section>

      {/* How to verify */}
      <section className="htw-section">
        <h2 className="htw-section-title">You Don't Have to Take Our Word for It</h2>
        <p className="htw-section-intro">
          You can verify this yourself. Here are three simple ways:
        </p>
        <div className="htw-verify-grid">
          <div className="htw-verify-card">
            <div className="htw-verify-icon">
              <WifiOff size={24} />
            </div>
            <h3>Turn Off Your Internet</h3>
            <p>
              Disconnect from Wi-Fi, then try any tool. It will still work perfectly —
              because the tool never needed the internet to process your file.
            </p>
          </div>
          <div className="htw-verify-card">
            <div className="htw-verify-icon">
              <Eye size={24} />
            </div>
            <h3>Watch Your Network Activity</h3>
            <p>
              Open your browser's Developer Tools (F12), go to the Network tab, and use
              any tool. You won't see any file data being sent out.
            </p>
          </div>
          <div className="htw-verify-card">
            <div className="htw-verify-icon">
              <FileCheck size={24} />
            </div>
            <h3>Check the Source Code</h3>
            <p>
              RDM Toolkit is open source. Every line of code is available for review. There
              are no hidden uploads, no tracking scripts, and no analytics.
            </p>
          </div>
        </div>
      </section>

      {/* What this means for compliance */}
      <section className="htw-section">
        <h2 className="htw-section-title">What This Means for Data Compliance</h2>
        <p className="htw-section-intro">
          If you work with sensitive data — research files, health records, grant
          documents, student information, or anything containing personal details —
          using third-party conversion sites can create compliance issues.
        </p>
        <div className="htw-compliance-grid">
          <div className="htw-compliance-card">
            <Lock size={20} />
            <div>
              <h3><a href="https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" target="_blank" rel="noopener noreferrer">PIPEDA</a> &amp; <a href="https://www.ontario.ca/laws/statute/04p03" target="_blank" rel="noopener noreferrer">PHIPA</a></h3>
              <p>
                Canadian privacy legislation requires that personal information be
                protected from unauthorised access. Uploading files to third-party
                servers creates a disclosure that may not be authorised.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <Globe size={20} />
            <div>
              <h3><a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer">GDPR</a></h3>
              <p>
                The EU's data protection regulation requires a legal basis for
                processing personal data. Free conversion sites typically don't
                meet these requirements.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <Shield size={20} />
            <div>
              <h3><a href="https://www.science.gc.ca/site/science/en/interagency-research-funding/policies-and-guidelines/research-data-management/tri-agency-research-data-management-policy" target="_blank" rel="noopener noreferrer">Tri-Agency RDM Policy</a></h3>
              <p>
                Canada's research funding agencies require data management plans
                that ensure data integrity and secure handling. Using unvetted
                websites introduces risk to your chain of custody.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <MonitorSmartphone size={20} />
            <div>
              <h3>With RDM Toolkit</h3>
              <p>
                Since files never leave your device, there is no data transfer,
                no third-party processing, and no disclosure to manage. The data
                stays under your control at all times.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bridge to RS Toolkit ── */}
      <section className="htw-section">
        <div className="htw-promise">
          <Shield size={32} />
          <div>
            <h2>Protecting Your Research Data</h2>
            <p>
              RDM Toolkit keeps your files off servers — but protecting your devices,
              accounts, and stored data is a separate challenge. For a full guide covering
              device encryption, passwords &amp; 2FA, backups, AI tool risks, and
              requirements for controlled research data, visit the{' '}
              <a
                href="https://seawaydigital.github.io/RSToolkit/#cybersecurity-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="htw-link"
              >
                Research Security Toolkit — Cybersecurity Best Practices
                <ExternalLink size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
              </a>.
            </p>
          </div>
        </div>

        <h3 className="htw-subsection-title">RDM Toolkit tools that help</h3>
        <p className="htw-section-intro">
          Several tools in this app directly reduce your security footprint when handling research files:
        </p>
        <div className="htw-compliance-grid">
          <a href="#password-protect-pdf" className="htw-compliance-card htw-compliance-card--link">
            <Lock size={20} />
            <div>
              <h3>Password Protect PDF</h3>
              <p>Add AES-256 encryption to a PDF before sharing — the recipient needs the password to open it.</p>
            </div>
          </a>
          <a href="#strip-file-metadata" className="htw-compliance-card htw-compliance-card--link">
            <Eye size={20} />
            <div>
              <h3>Strip Metadata</h3>
              <p>Remove hidden author, location, and device information from files before sharing externally.</p>
            </div>
          </a>
          <a href="#sha256-hasher" className="htw-compliance-card htw-compliance-card--link">
            <FileCheck size={20} />
            <div>
              <h3>SHA-256 Hasher</h3>
              <p>Generate a hash fingerprint to verify a file hasn't been altered after transfer or storage.</p>
            </div>
          </a>
          <a href="#encrypt-decrypt-text" className="htw-compliance-card htw-compliance-card--link">
            <Shield size={20} />
            <div>
              <h3>Encrypt / Decrypt Text</h3>
              <p>Encrypt sensitive notes or data snippets with AES-256 before pasting them anywhere.</p>
            </div>
          </a>
        </div>
      </section>

      {/* Common questions */}
      <section className="htw-section">
        <h2 className="htw-section-title">Common Questions</h2>
        <div className="htw-faq">
          <details className="htw-faq-item">
            <summary>Do I need to create an account?</summary>
            <p>
              No. RDM Toolkit does not have accounts, logins, or any form of registration.
              You open the page and start using it immediately.
            </p>
          </details>
          <details className="htw-faq-item">
            <summary>Is anything stored after I close the tab?</summary>
            <p>
              No. RDM Toolkit does not use cookies, local storage, or any form of data
              persistence. When you close the browser tab, everything you were working
              on is gone. If you need a file, download it before closing.
            </p>
          </details>
          <details className="htw-faq-item">
            <summary>Does RDM Toolkit track what I do?</summary>
            <p>
              No. There are no analytics, no tracking pixels, no usage monitoring,
              and no telemetry of any kind. RDM Toolkit does not know who you are,
              what files you process, or how often you visit.
            </p>
          </details>
          <details className="htw-faq-item">
            <summary>Can my IT department see what files I'm working with?</summary>
            <p>
              Your IT department can see that you visited the RDM Toolkit website (like
              any website visit), but they cannot see the contents of the files you
              process because those files never leave your browser. The processing
              happens entirely in memory on your own device.
            </p>
          </details>
          <details className="htw-faq-item">
            <summary>Is there a file size limit?</summary>
            <p>
              RDM Toolkit processes files using your browser's memory, so very large
              files (typically over 500 MB) may be slow or cause your browser to
              run low on memory. For most everyday documents, spreadsheets, and
              images, you won't hit any limits.
            </p>
          </details>
          <details className="htw-faq-item">
            <summary>Who built this?</summary>
            <p>
              RDM Toolkit was developed as a Research Data Management resource by the
              Office of Research Services at Lakehead University.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
