import { useEffect } from 'react';
import { BookA, ArrowRight } from 'lucide-react';
import { GLOSSARY, getTerm } from '../../data/glossary';
import { scrollToId } from '../../utils/scrollToId';

const termAnchor = id => `term-${id}`;

// First letter → terms, for the A–Z index.
const LETTERS = GLOSSARY.reduce((acc, t) => {
  const letter = t.term[0].toUpperCase();
  if (!acc[letter]) acc[letter] = [];
  acc[letter].push(t);
  return acc;
}, {});

/**
 * Glossary page. `term` (from #glossary?term=<id>, e.g. a search result)
 * scrolls to and highlights that entry.
 */
export default function Glossary({ term }) {
  useEffect(() => {
    if (!term || !getTerm(term)) return;
    // Let the entries lay out before scrolling (a timer rather than
    // requestAnimationFrame, which never fires in a background tab).
    const timer = setTimeout(() => scrollToId(termAnchor(term), { smooth: false }), 50);
    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Plain language</div>
        <h1 className="htw-title">Glossary</h1>
        <p className="htw-subtitle">
          The research data terms used across this site, explained briefly. Each one links
          to the page or tool where it matters most.
        </p>
      </div>

      <nav className="glossary-index" aria-label="Glossary by letter">
        {Object.entries(LETTERS).map(([letter, terms]) => (
          <button
            key={letter}
            type="button"
            className="glossary-index-btn"
            onClick={() => scrollToId(termAnchor(terms[0].id))}
            aria-label={`Terms starting with ${letter}`}
          >
            {letter}
          </button>
        ))}
      </nav>

      <dl className="glossary-list">
        {GLOSSARY.map(t => (
          <div
            key={t.id}
            id={termAnchor(t.id)}
            tabIndex={-1}
            className={`glossary-entry${term === t.id ? ' glossary-entry--target' : ''}`}
          >
            <dt className="glossary-term">
              {t.term}
              {t.aka && <span className="glossary-aka">Also: {t.aka.join(', ')}</span>}
            </dt>
            <dd className="glossary-def">
              <p>{t.definition}</p>
              {(t.related?.length > 0 || t.link) && (
                <div className="glossary-meta">
                  {t.related?.length > 0 && (
                    <span className="glossary-related">
                      See also:{' '}
                      {t.related.map((r, i) => (
                        <span key={r}>
                          {i > 0 && ', '}
                          <button
                            type="button"
                            className="glossary-related-btn"
                            onClick={() => scrollToId(termAnchor(r))}
                          >
                            {getTerm(r).term}
                          </button>
                        </span>
                      ))}
                    </span>
                  )}
                  {t.link && (
                    <a className="glossary-link" href={`#${t.link.hash}`}>
                      {t.link.label}
                      <ArrowRight size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="glossary-foot">
        <BookA size={14} aria-hidden="true" />
        Missing a term? Use the Feedback button at the top of the page to suggest one.
      </p>
    </div>
  );
}
