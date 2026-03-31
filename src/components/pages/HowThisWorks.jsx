import { Shield, WifiOff, Wifi, HardDrive, Eye, Server, FileCheck, Lock, Globe, MonitorSmartphone, ArrowRight, ArrowDown, CheckCircle, XCircle, Laptop, KeyRound, Database, CloudOff, AlertTriangle, Copy, Terminal, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';

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
              <h3>PIPEDA & PHIPA</h3>
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
              <h3>GDPR</h3>
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
              <h3>Tri-Agency RDM Policy</h3>
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

      {/* ── Security Best Practices for Researchers ── */}
      <section className="htw-section">
        <h2 className="htw-section-title">Protecting Your Research Data: A Practical Guide</h2>
        <p className="htw-section-intro">
          RDM Toolkit keeps your files off servers — but once a file leaves the tool,
          protecting it is up to you. These practices are drawn from{' '}
          <a
            href="https://www.lakeheadu.ca/research-and-innovation/research-services/resources/safeguarding-research-resources/cybersecurity"
            target="_blank"
            rel="noopener noreferrer"
            className="htw-link"
          >
            Lakehead University's Cybersecurity guidance for researchers
            <ExternalLink size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          </a>
          .
        </p>

        {/* 7 Essential Actions */}
        <div className="htw-security-callout">
          <div className="htw-security-callout-header">
            <Shield size={20} />
            <strong>7 Essential Actions for Every Researcher</strong>
          </div>
          <ol className="htw-security-essentials">
            <li><KeyRound size={14} /><span>Enable <strong>2FA on both Duo and Google</strong> separately — they protect different Lakehead systems</span></li>
            <li><Lock size={14} /><span>Use a <strong>password manager</strong> (Bitwarden is free; 1Password is included with many accounts)</span></li>
            <li><Laptop size={14} /><span><strong>Encrypt your laptop</strong> — BitLocker on Windows, FileVault on Mac</span></li>
            <li><Wifi size={14} /><span>Use <strong>VPN on public networks</strong>, especially while travelling internationally</span></li>
            <li><CloudOff size={14} /><span><strong>Never enter sensitive research data into AI tools</strong> like ChatGPT, Copilot, or Gemini</span></li>
            <li><Copy size={14} /><span>Follow the <strong>3-2-1 backup rule</strong>: 3 copies, 2 different media, 1 offsite</span></li>
            <li><AlertTriangle size={14} /><span>Know how to <strong>report a security incident</strong> — contact TSC immediately if something feels wrong</span></li>
          </ol>
        </div>

        {/* Encrypting files */}
        <h3 className="htw-subsection-title">Encrypting Files Before Uploading to Cloud Storage</h3>
        <p className="htw-section-intro">
          Even when using Lakehead-approved services like Google Drive, you should encrypt files that contain
          personal information, unpublished findings, industry partner materials, grant proposals, or anything
          covered by an NDA. Encrypt the file first, then upload the encrypted version.
        </p>

        <div className="htw-encrypt-grid">
          <div className="htw-encrypt-card">
            <div className="htw-encrypt-card-header">
              <Terminal size={18} />
              <h4>Windows — 7-Zip (Free)</h4>
            </div>
            <ol className="htw-encrypt-steps">
              <li>Download <strong>7-Zip</strong> from 7-zip.org (free, open-source)</li>
              <li>Right-click your file or folder → <strong>7-Zip → Add to archive</strong></li>
              <li>Set format to <strong>7z</strong></li>
              <li>Set encryption method to <strong>AES-256</strong></li>
              <li>Enter a strong passphrase (12+ characters)</li>
              <li>Upload the resulting <code>.7z</code> file to Google Drive</li>
            </ol>
            <div className="htw-encrypt-tip">
              <CheckCircle size={14} />
              Share the password separately from the file — never in the same email.
            </div>
          </div>

          <div className="htw-encrypt-card">
            <div className="htw-encrypt-card-header">
              <Terminal size={18} />
              <h4>Mac — Terminal (Built-in)</h4>
            </div>
            <ol className="htw-encrypt-steps">
              <li>Open <strong>Terminal</strong> (Applications → Utilities)</li>
              <li>Run: <code>zip -er ~/Desktop/encrypted.zip /path/to/file</code></li>
              <li>Enter a strong passphrase when prompted</li>
              <li>Upload <code>encrypted.zip</code> to Google Drive</li>
            </ol>
            <div className="htw-encrypt-tip">
              <CheckCircle size={14} />
              For cross-platform sharing (Mac → Windows), consider <strong>VeraCrypt</strong> for consistent results.
            </div>
          </div>

          <div className="htw-encrypt-card">
            <div className="htw-encrypt-card-header">
              <Lock size={18} />
              <h4>Using RDM Toolkit</h4>
            </div>
            <ol className="htw-encrypt-steps">
              <li>Use <strong>Encrypt Text</strong> to encrypt notes or data snippets with AES-256 before pasting anywhere</li>
              <li>Use <strong>Password Protect PDF</strong> to add a password before sharing PDF reports</li>
              <li>Use <strong>Strip Metadata</strong> to remove hidden author/location info from files before sharing</li>
              <li>Use <strong>Hash File (SHA-256)</strong> to verify a file hasn't been tampered with after transfer</li>
            </ol>
            <div className="htw-encrypt-tip">
              <CheckCircle size={14} />
              All of these run entirely in your browser — nothing is uploaded.
            </div>
          </div>
        </div>

        {/* Device encryption */}
        <h3 className="htw-subsection-title">Encrypting Your Device</h3>
        <p className="htw-section-intro">
          If your laptop is stolen without device encryption, anyone can read every file on it — regardless of your login password.
          Device encryption is your last line of defence.
        </p>
        <div className="htw-device-grid">
          <div className="htw-device-card">
            <Laptop size={20} />
            <div>
              <h4>Windows — BitLocker</h4>
              <p>Settings → Privacy &amp; Security → Device Encryption → turn it on. Save your recovery key to your Lakehead Microsoft account, not just locally.</p>
            </div>
          </div>
          <div className="htw-device-card">
            <Laptop size={20} />
            <div>
              <h4>Mac — FileVault</h4>
              <p>System Settings → Privacy &amp; Security → FileVault → turn it on. Choose to store the recovery key in your iCloud account or write it down and keep it somewhere safe.</p>
            </div>
          </div>
          <div className="htw-device-card">
            <HardDrive size={20} />
            <div>
              <h4>USB Drives &amp; External Storage</h4>
              <p>Never store research data on an unencrypted USB drive. Use BitLocker To Go (Windows) or the built-in Encrypt option on Mac. For cross-platform drives, use VeraCrypt (free).</p>
            </div>
          </div>
        </div>

        {/* Passwords & 2FA */}
        <h3 className="htw-subsection-title">Passwords &amp; Two-Factor Authentication</h3>
        <div className="htw-compliance-grid">
          <div className="htw-compliance-card">
            <KeyRound size={20} />
            <div>
              <h3>Strong Passphrases</h3>
              <p>
                Use four or more random words — "Closet lamp Bathroom Mug" is stronger than "P@ssw0rd!". The Canadian Centre for Cyber Security recommends at least 12 characters.
                Check if your email has been in a breach at <strong>haveibeenpwned.com</strong>.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <Lock size={20} />
            <div>
              <h3>Password Managers</h3>
              <p>
                Use <strong>Bitwarden</strong> (free, open-source) or <strong>1Password</strong> to generate and store unique passwords for every account. Never reuse passwords, especially for research systems.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <Smartphone size={20} />
            <div>
              <h3>Two-Factor Authentication</h3>
              <p>
                Lakehead requires 2FA in <strong>two separate places</strong>: Duo Security (for myInfo, D2L) and Google 2-Step Verification (for your Lakehead Google account). Set up both, plus enable 2FA on all other research-related accounts.
              </p>
            </div>
          </div>
          <div className="htw-compliance-card">
            <RefreshCw size={20} />
            <div>
              <h3>The 3-2-1 Backup Rule</h3>
              <p>
                Keep <strong>3 copies</strong> of important research data, on <strong>2 different types of media</strong> (e.g., laptop + external drive), with <strong>1 copy offsite</strong> (e.g., Lakehead Google Drive or OneDrive). The LUFA Collective Agreement requires research data to be retained for at least 7 years.
              </p>
            </div>
          </div>
        </div>

        {/* AI tools warning */}
        <div className="htw-ai-warning">
          <AlertTriangle size={20} />
          <div>
            <strong>Do not input sensitive research data into AI tools.</strong>
            <p>
              ChatGPT, Microsoft Copilot, Google Gemini, and similar services may store and use your inputs
              for training. Never paste participant data, unpublished findings, confidential partner information,
              grant text, or anything covered by an ethics protocol into these tools. If you need AI assistance
              with sensitive research, contact the Research Security and Data Management Specialist to discuss
              approved alternatives.
            </p>
          </div>
        </div>

        {/* Certain research data */}
        <div className="htw-promise" style={{ marginTop: 'var(--space-lg)' }}>
          <Database size={32} />
          <div>
            <h2>Special Requirements for Certain Research Data</h2>
            <p>
              Some categories of research data <strong>must</strong> be stored on Canadian-hosted servers only.
              This includes defence contracts, Controlled Goods research, provincial health datasets, and projects
              with specific ethics approval requirements. Before storing sensitive data on any cloud service,
              consult the <strong>Research Security and Data Management Specialist</strong> in the Office of
              Research Services.
            </p>
            <p style={{ marginTop: '12px' }}>
              Contact: <strong>rdm.research@lakeheadu.ca</strong>
            </p>
          </div>
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
