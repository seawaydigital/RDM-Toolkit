import { MAILTO, PROJECT } from '../../data/institutionConfig';
import { POLICY_PAGES } from '../../data/legal';

/**
 * Site-wide footer under every route. It sits inside <main> because <main> is
 * the scroll container, so the links are wrapped in a labelled <nav> to give
 * them a landmark of their own.
 */
export default function SiteFooter({ currentPage }) {
  return (
    <footer className="site-footer">
      <nav aria-label="Site policies and contact">
        <ul className="site-footer-links">
          {POLICY_PAGES.map(({ hash, label }) => (
            <li key={hash}>
              <a href={`#${hash}`} aria-current={currentPage === hash ? 'page' : undefined}>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href={MAILTO.rdm}>Contact</a>
          </li>
          <li>
            <a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">
              Source code
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
