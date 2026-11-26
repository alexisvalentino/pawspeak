import { useState } from 'react';
import { ArrowLeft, Cat, ChevronRight, Dog, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { BODY_LANGUAGE, EVIDENCE_SCALE, type BodyLanguageEntry } from '../data/bodyLanguage';
import type { PetKind } from '../ml/petClassifier';
import { Modal } from './modals/Modal';

const STATUS_CLASS: Record<BodyLanguageEntry['status'], string> = {
  Safe: 'status-safe', Caution: 'status-caution', Stop: 'status-stop',
};

function paragraphs(value: string) {
  return value.split(/\n\s*\n/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>);
}

export function DictionaryScreen({ species, onSpeciesChange }: { species: PetKind; onSpeciesChange: (species: PetKind) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<BodyLanguageEntry | null>(null);
  const speciesEntries = BODY_LANGUAGE.filter(entry => entry.species === species);
  const categories = ['All', ...new Set(speciesEntries.map(entry => entry.cueType))];
  const normalizedQuery = query.trim().toLowerCase();
  const entries = speciesEntries.filter(entry => (category === 'All' || entry.cueType === category)
    && (!normalizedQuery || [entry.name, entry.cueType, entry.status, entry.evidenceSummary, entry.plainWords,
      entry.whatItCanMean, entry.context, entry.whatToDo, entry.notes, ...entry.sources.map(source => source.citation)]
      .join(' ').toLowerCase().includes(normalizedQuery)));

  return <div>
    <header className="screen-heading dictionary-heading"><div><h1>Body-language dictionary</h1><p>Learn what a cue may mean in its situation.</p></div></header>
    <div className="species-switch" role="group" aria-label="Choose animal">
      <button className={species === 'dog' ? 'species-active' : ''} aria-pressed={species === 'dog'} onClick={() => { setCategory('All'); onSpeciesChange('dog'); }}><Dog />Dog</button>
      <button className={species === 'cat' ? 'species-active' : ''} aria-pressed={species === 'cat'} onClick={() => { setCategory('All'); onSpeciesChange('cat'); }}><Cat />Cat</button>
    </div>
    <label className="search-field"><Search /><span className="sr-only">Search body language</span><input type="search" placeholder={`Search ${species} cues…`} value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="category-scroll" aria-label="Filter by body-language cue type">{categories.map(item => <button key={item} aria-pressed={category === item} className={category === item ? 'filter-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <details className="evidence-scale">
      <summary>How the evidence score works</summary>
      <p>Scores are from 1 to 10, with 10 the highest. The same rubric is used for cats and dogs, so the scores are comparable. They describe the supporting evidence, not certainty about one pet.</p>
      <ul>{EVIDENCE_SCALE.map(item => <li key={item.score}><strong>{item.score}/10</strong><span>{item.meaning}</span></li>)}</ul>
    </details>
    <p className="results-count">{entries.length} {species} cues to explore</p>
    {entries.length ? <div className="dictionary-grid">{entries.map(entry => {
      return <button className="dictionary-card" key={entry.id} onClick={() => setSelected(entry)}>
        <span className={`cue-icon ${STATUS_CLASS[entry.status]}`}><img className="cue-mascot-art" src={`/cues/${entry.id}.webp`} alt="" loading="lazy" decoding="async" /></span>
        <span className="dictionary-card-text"><strong>{entry.name}</strong><span className="dictionary-card-meaning">{entry.plainWords}</span>
          <small><span className={`status-label ${STATUS_CLASS[entry.status]}`}>{entry.status}</span></small>
        </span><ChevronRight />
      </button>;
    })}</div> : <div className="empty-state"><h2>No cues found</h2><p>Try another word or choose All.</p><button className="btn-text" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button></div>}
    <aside className="dictionary-whole-picture"><ShieldCheck aria-hidden="true" /><p><strong>One cue never tells the whole story.</strong><span>Compare posture, context, and what happens next.</span></p></aside>
    {selected && <Modal label={selected.name} onClose={() => setSelected(null)}><div className="modal-panel dictionary-detail">
      <button className="modal-close" aria-label="Close cue details" onClick={() => setSelected(null)}><ArrowLeft /></button>
      <span className={`cue-icon detail-cue-icon ${STATUS_CLASS[selected.status]}`}><img className="cue-mascot-art" src={`/cues/${selected.id}.webp`} alt="" decoding="async" /></span>
      <span className="detail-category">{selected.species === 'dog' ? 'Dog' : 'Cat'} · {selected.cueType}</span>
      <h2>{selected.name}</h2>
      <section className="detail-highlight"><h3>In plain words</h3>{paragraphs(selected.plainWords)}</section>
      <p className="entry-status"><span className={`status-label ${STATUS_CLASS[selected.status]}`}>{selected.status}</span></p>
      <section><h3>What it can mean</h3>{paragraphs(selected.whatItCanMean)}</section>
      <section><h3>Context</h3>{paragraphs(selected.context)}</section>
      <section className="detail-action"><h3>What to do</h3>{paragraphs(selected.whatToDo)}</section>
      {selected.notes && <section className="entry-notes"><h3>Notes</h3>{paragraphs(selected.notes)}</section>}
      <details className="source-citations"><summary>Sources and evidence ({selected.sources.length})</summary>
        <div className="source-evidence"><strong>Evidence confidence: {selected.confidence}/10</strong><p>{selected.evidenceSummary}</p></div>
        <ul>{selected.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.number}.</strong> {source.citation}</span><ExternalLink aria-hidden="true" /></a></li>)}</ul>
      </details>
      <div className="related-cues"><h3>Related cues</h3><div>{selected.related.map(relatedCue => {
        const related = BODY_LANGUAGE.find(entry => entry.id === relatedCue.id);
        return related ? <button key={relatedCue.id} className="btn-secondary" onClick={() => setSelected(related)}>{related.name}</button> : null;
      })}</div></div>
      <p className="detail-disclaimer">One cue never tells the whole story. Look at the whole body, the situation, and what your pet does next.</p>
    </div></Modal>}
  </div>;
}
