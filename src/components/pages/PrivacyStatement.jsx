import { CheckCircle, ShieldCheck } from 'lucide-react';
import { INSTITUTION, MAILTO } from '../../data/institutionConfig';
import { LEGAL_UPDATED, STORED_ITEMS } from '../../data/legal';
import { formatReviewDate } from '../../data/contentReview';
import ClearLocalData from '../ui/ClearLocalData';

// Open decisions for this page (who is responsible for it, how Lakehead
// handles feedback email) are listed in docs/LEGAL-PAGES.md. The hosting
// section names GitHub Pages: rewrite it whenever the host changes.

const GITHUB_PAGES_DOCS = 'https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages';
const GITHUB_PRIVACY = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

const SUMMARY = [
  'The files you process and the text you type stay on your device. They are never uploaded.',
  'There are no accounts, cookies, analytics, advertising or third-party scripts.',
  'The site keeps a few small settings in your browser, listed below, and you can delete them at any time.',
  'The web host, GitHub, logs visitors’ IP addresses for security.',
  'If you email us, we receive what you choose to send.',
];

export default function PrivacyStatement() {
  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Privacy</div>
        <h1>Privacy statement</h1>
        <p className="htw-hero-subtitle">
          RDM Toolkit never receives the files you work on. This page says what
          it does keep, what the web host records, and what happens when you
          contact us.
        </p>
      </div>

      <section className="legal-section">
        <h2 className="htw-section-title">The short version</h2>
        <ul className="legal-summary">
          {SUMMARY.map(line => (
            <li key={line}>
              <CheckCircle size={16} aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Files you process</h2>
        <p className="legal-lede">
          Every tool reads your file into your browser’s memory, works on it
          there, and offers the result as a download. The file, its name and its
          contents are not sent over the network. The site’s content security policy also
          tells your browser to refuse any connection the page tries to make to
          another server.{' '}
          <a href="#how-this-works">How This Works</a> shows how to check this
          for yourself.
        </p>
        <p className="legal-lede">
          When you close the tab, your files are gone from the browser’s memory.
          Results you download are saved wherever your browser saves files, and
          protecting them from then on is up to you.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">What is kept in your browser</h2>
        <p className="legal-lede">
          The site sets no cookies. It keeps the items below in your browser’s
          local storage, on this device only. They are never sent to us, and we
          cannot see them.
        </p>
        <ul className="legal-stored">
          {STORED_ITEMS.map(item => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              <p>{item.holds}</p>
              <p className="legal-stored-why">{item.why}</p>
            </li>
          ))}
        </ul>
        <p className="legal-lede">
          The usage log is off unless you turned it on in the welcome tour. To
          turn it off and delete what it recorded, or to remove everything above
          on a shared computer, use this button. Clearing this site’s data in
          your browser’s settings does the same.
        </p>
        <ClearLocalData />
        <p className="legal-lede legal-lede--spaced">
          Your browser also keeps a copy of the site’s own code, but not your
          files, so the tools work without an internet connection.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">What the web host records</h2>
        <p className="legal-lede">
          The site is hosted on GitHub Pages, run by GitHub, Inc. GitHub’s{' '}
          <a href={GITHUB_PAGES_DOCS} target="_blank" rel="noopener noreferrer">
            documentation
          </a>{' '}
          says that when a GitHub Pages site is visited, “the visitor’s IP
          address is logged and stored for security purposes”. Those logs are
          GitHub’s. We do not receive them and do not use them. GitHub handles
          them under its{' '}
          <a href={GITHUB_PRIVACY} target="_blank" rel="noopener noreferrer">
            General Privacy Statement
          </a>.
        </p>
        <p className="legal-lede">
          A web server log of this kind can show your IP address, the time, your
          browser’s name and which of the site’s own files your browser
          downloaded. It does not contain your files or anything you type.
        </p>
        <p className="legal-lede">
          As with any website, your internet provider, and Lakehead’s network if
          you are on campus, can see that you visited the site. They cannot see
          the files you process.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Links you share</h2>
        <p className="legal-lede">
          The Storage Calculator’s share link puts your numbers in the web
          address. Anyone you send it to can read them, and the web host’s log
          records the address when the link is opened. The link holds only
          numbers, yes-or-no settings and the calculator’s own labels, never
          text you typed.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">When you contact us</h2>
        {/* DECISION D5 (docs/LEGAL-PAGES.md): Lakehead to confirm how feedback
            email is used and kept, and whether FIPPA needs a notice here. */}
        <p className="legal-lede">
          The Feedback button and the “Tell us” and “Report this problem” links
          open a message in your own email program, addressed to{' '}
          <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>. Nothing is sent until
          you press send there. The draft includes the address of the page you
          were on, your browser’s name and window size, whether you were online,
          any error message with its technical details, and your usage log if
          you tick the box for it. You can change or delete any of it before
          sending.
        </p>
        <p className="legal-lede">
          Your message goes to the {INSTITUTION.researchOffice} at{' '}
          {INSTITUTION.name}, along with your email address and anything you
          attach. It is used to reply to you and to fix what you report.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Other websites</h2>
        <p className="legal-lede">
          This site links to many others, such as funders, repositories and
          GitHub. They have their own privacy policies. Most of these links open
          in a new tab and are set so the other site is not told you came from
          here. Either way, the part of the address that names a tool or page
          (after the #) is never sent to any server.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="htw-section-title">Questions and changes</h2>
        <p className="legal-lede">
          For questions about this statement or about your personal
          information, email <a href={MAILTO.rdm}>{INSTITUTION.rdmEmail}</a>.
        </p>
        <p className="legal-lede">
          If what the site keeps, or who hosts it, changes, this page is updated
          first.
        </p>
        <p className="acc-meta">
          <ShieldCheck size={14} aria-hidden="true" /> Last updated{' '}
          {formatReviewDate(LEGAL_UPDATED)}.
        </p>
      </section>
    </div>
  );
}
