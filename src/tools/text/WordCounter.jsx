import { useState, useMemo } from 'react';
import InfoCard from '../../components/ui/InfoCard';

export default function WordCounter({ tool }) {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const sentences = text.trim() === '' ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.trim() === '' ? 0 : text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const lines = text === '' ? 0 : text.split('\n').length;
    const readingTimeMinutes = words / 238;
    const readingTimeSeconds = Math.round(readingTimeMinutes * 60);

    let readingTimeDisplay;
    if (readingTimeSeconds < 60) {
      readingTimeDisplay = `${readingTimeSeconds} sec`;
    } else {
      const mins = Math.floor(readingTimeMinutes);
      const secs = Math.round((readingTimeMinutes - mins) * 60);
      readingTimeDisplay = secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
    }

    return { words, characters, charactersNoSpaces, sentences, paragraphs, lines, readingTimeDisplay };
  }, [text]);

  return (
    <div>
      <InfoCard description="Live word, character, sentence, and paragraph counts. Includes reading time estimate at 238 words per minute. All processing happens locally in your browser — nothing is transmitted." />

      <div className="word-counter-stats">
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.words}</span>
          <span className="word-counter-stat-label">Words</span>
        </div>
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.characters}</span>
          <span className="word-counter-stat-label">Characters</span>
        </div>
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.charactersNoSpaces}</span>
          <span className="word-counter-stat-label">Characters (no spaces)</span>
        </div>
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.sentences}</span>
          <span className="word-counter-stat-label">Sentences</span>
        </div>
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.paragraphs}</span>
          <span className="word-counter-stat-label">Paragraphs</span>
        </div>
        <div className="word-counter-stat">
          <span className="word-counter-stat-value">{stats.lines}</span>
          <span className="word-counter-stat-label">Lines</span>
        </div>
        <div className="word-counter-stat word-counter-stat--wide">
          <span className="word-counter-stat-value">{stats.readingTimeDisplay}</span>
          <span className="word-counter-stat-label">Reading Time</span>
        </div>
      </div>

      <textarea
        className="text-tool-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Start typing or paste your text here..."
        rows={16}
        spellCheck={false}
      />
    </div>
  );
}
