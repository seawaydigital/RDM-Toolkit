import { Mail, Server, AlertTriangle, FileText, Video, Globe, Cpu, Image, Code } from 'lucide-react';

const CONSIDERED_TOOLS = [
  {
    name: 'DOCX to PDF / PDF to DOCX',
    icon: FileText,
    reason: 'Browser-based DOCX-to-PDF conversion cannot replicate the full rendering engine of Microsoft Word. Fonts, tables, headers, footers, and complex layouts do not convert reliably without a server-side rendering engine.',
    workaround: 'Open your file in Microsoft Word, then go to File \u2192 Save As (or Export) and select PDF as the format. On Mac, you can also use File \u2192 Print \u2192 Save as PDF. Google Docs can also export to PDF via File \u2192 Download \u2192 PDF Document.',
  },
  {
    name: 'OCR (Scanned PDF to Searchable PDF)',
    icon: Cpu,
    reason: 'Optical character recognition requires large machine learning models and significant processing power. The accuracy is not yet reliable enough for research documents where precision matters.',
    workaround: 'Adobe Acrobat Pro (available through most university site licences) can perform OCR via Tools \u2192 Scan & OCR \u2192 Recognize Text. Free alternatives include NAPS2 (Windows) or the built-in Preview OCR on macOS Ventura and later.',
  },
  {
    name: 'Audio & Video Conversion',
    icon: Video,
    reason: 'Converting between audio and video formats requires FFmpeg, which as a WebAssembly build adds over 30 MB to the page load and falls outside the primary use case of document management.',
    workaround: 'VLC Media Player (free, available on all platforms) can convert between formats via Media \u2192 Convert/Save. HandBrake is another free option specifically for video conversion.',
  },
  {
    name: 'Excel to PDF / PDF to Excel',
    icon: FileText,
    reason: 'Spreadsheet rendering with accurate cell widths, merged cells, charts, and conditional formatting requires a full spreadsheet engine that cannot run in a browser.',
    workaround: 'In Microsoft Excel, go to File \u2192 Save As and select PDF. For PDF to Excel, Adobe Acrobat Pro can export PDFs as spreadsheets via File \u2192 Export To \u2192 Spreadsheet. Google Sheets can also export to PDF via File \u2192 Download \u2192 PDF Document.',
  },
  {
    name: 'PowerPoint to PDF',
    icon: FileText,
    reason: 'Slide rendering with embedded media, custom fonts, and precise layout positioning requires a presentation engine that does not exist in browser-side JavaScript.',
    workaround: 'In Microsoft PowerPoint, go to File \u2192 Save As (or Export) and select PDF. On Mac, you can also use File \u2192 Print \u2192 Save as PDF. Google Slides offers the same via File \u2192 Download \u2192 PDF Document.',
  },
  {
    name: 'Email (.eml / .msg) Parsing',
    icon: Mail,
    reason: 'The .msg format is a proprietary Microsoft binary format that requires complex parsing libraries. Reliable extraction of attachments and formatting is not feasible in-browser.',
    workaround: 'In Microsoft Outlook, open the email and go to File \u2192 Save As to save it as a .pdf or .html file. For .eml files, most email clients (Thunderbird, Apple Mail) can open and print them to PDF.',
  },
  {
    name: 'Cloud Storage Integration',
    icon: Globe,
    reason: 'Connecting to Google Drive, OneDrive, or Dropbox would require API calls to external servers, which would break the zero-network-transmission guarantee that is core to this tool.',
    workaround: 'Download the file from your cloud storage to your computer first, then use RDM Toolkit to process it locally. The result can then be uploaded back to your cloud storage manually.',
  },
  {
    name: 'Remove Background',
    icon: Image,
    reason: 'Background removal is not relevant to research data management workflows. While technically feasible in-browser using neural network models, it is an image editing feature rather than a research data tool, and including it would broaden the scope of RDM Toolkit beyond its intended purpose.',
    workaround: 'Free online tools such as remove.bg or Canva can remove image backgrounds. Both GIMP (free, desktop) and Adobe Photoshop offer background removal using selection or AI tools.',
  },
  {
    name: 'JWT Decoder',
    icon: Code,
    reason: 'JSON Web Token decoding is a developer utility with no direct application to research data management. RDM Toolkit is focused on tools that help researchers handle files, documents, and data — not web application authentication tokens.',
    workaround: 'jwt.io provides a free, client-side JWT decoder. Many code editors and browser developer tools also have built-in JSON formatting that can display decoded token payloads.',
  },
  {
    name: 'Colour Converter',
    icon: Code,
    reason: 'Converting between HEX, RGB, and HSL colour formats is a web and graphic design utility that does not serve research data management needs. It falls outside the scope of RDM Toolkit.',
    workaround: 'Browser developer tools (F12 in most browsers) include colour pickers with format conversion. Many design tools such as Figma, Canva, and Adobe products also convert between colour formats natively.',
  },
];

export default function RequestATool() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Submissions welcome</div>
        <h1 className="htw-title">Request a Tool</h1>
        <p className="htw-subtitle">
          Have an idea for a tool that should be added? Let us know.
        </p>
      </div>

      {/* Contact */}
      <section className="htw-section">
        <div className="htw-promise">
          <Mail size={32} />
          <div>
            <h2>Suggest a New Tool</h2>
            <p>
              If there is a file operation you regularly need that is not covered by the
              current tools, we would like to hear about it. Send your suggestion to:
            </p>
            <p style={{ marginTop: '12px' }}>
              <a
                href="mailto:rdm.research@lakeheadu.ca?subject=RDM%20Toolkit%20-%20Tool%20Request"
                style={{ fontSize: 16, fontWeight: 600 }}
              >
                rdm.research@lakeheadu.ca
              </a>
            </p>
            <p style={{ marginTop: '12px', fontSize: 13, color: 'var(--text-muted)' }}>
              Please include what the tool would do, what file types it would handle,
              and how it would help your workflow. We review all suggestions and prioritise
              based on demand and technical feasibility.
            </p>
          </div>
        </div>
      </section>

      {/* Tools considered but not feasible */}
      <section className="htw-section">
        <h2 className="htw-section-title">Tools We Have Considered</h2>
        <p className="htw-section-intro">
          The following tools have been evaluated but cannot currently be included.
          Every tool in RDM Toolkit must run entirely in your browser with no server
          involvement. Some operations require server-side processing, proprietary
          rendering engines, or dependencies that are too large to deliver through
          a static website.
        </p>

        <div className="htw-faq">
          {CONSIDERED_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <details key={tool.name} className="htw-faq-item">
                <summary>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                    {tool.name}
                  </span>
                </summary>
                <p>{tool.reason}</p>
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '3px solid var(--accent-green)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)',
                }}>
                  <strong style={{ color: 'var(--accent-green)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>How to do this instead:</strong>
                  <br />
                  {tool.workaround}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Why these limits exist */}
      <section className="htw-section">
        <div className="htw-promise" style={{ borderLeftColor: 'var(--accent-amber)' }}>
          <AlertTriangle size={28} style={{ color: 'var(--accent-amber)' }} />
          <div>
            <h2>Why Some Tools Cannot Be Added</h2>
            <p>
              RDM Toolkit is built on a strict principle: your files never leave your
              device. Every tool must run entirely in your browser using JavaScript
              and WebAssembly. This means we cannot use server-side processing, cloud
              APIs, or proprietary software engines — even if they would produce better results.
            </p>
            <p style={{ marginTop: '12px' }}>
              If a tool cannot meet the quality standard researchers need while running
              purely in the browser, we choose not to include it rather than offer a
              misleading experience.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
