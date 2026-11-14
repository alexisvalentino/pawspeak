import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [inputPath, outputPath = 'src/data/bodyLanguageData.ts'] = process.argv.slice(2);
if (!inputPath) {
  throw new Error('Usage: node scripts/import-body-language.mjs <dictionary.txt> [output.ts]');
}

function markdownLink(line) {
  const split = line.indexOf('](');
  const end = line.lastIndexOf(')');
  if (split < 0 || end <= split + 2) return null;
  return {
    label: line.slice(1, split),
    url: line.slice(split + 2, end).replace(/\\([_()])/g, '$1'),
  };
}

function section(block, heading) {
  const marker = `#### ${heading}`;
  const start = block.indexOf(marker);
  if (start < 0) return '';
  const contentStart = block.indexOf('\n', start) + 1;
  const endings = ['#### What it can mean', '#### Context', '#### What to do', '**Related.**', '**Notes.**', '**Sources**']
    .map(value => block.indexOf(value, contentStart)).filter(index => index >= 0);
  const end = endings.length ? Math.min(...endings) : block.length;
  return block.slice(contentStart, end).trim();
}

function parseEntry(id, name, block) {
  const species = id.startsWith('cat-') ? 'cat' : id.startsWith('dog-') ? 'dog' : null;
  const cueType = block.match(/^\*([^*\r\n]+)\*$/m)?.[1];
  const confidence = block.match(/^\*\*(Safe|Caution|Stop)\*\* · \*\*Confidence (\d+)\/10\*\*$/m);
  const plainWords = block.match(/^\*\*In plain words:\*\*\s*(.+)$/m)?.[1]?.trim();
  const relatedLine = block.match(/^\*\*Related\.\*\*(.*)$/m)?.[1] ?? '';
  const notes = block.match(/^\*\*Notes\.\*\*\s*(.+)$/m)?.[1]?.trim() ?? '';
  const sourcesStart = block.indexOf('**Sources**');
  const sourceBlock = sourcesStart < 0 ? '' : block.slice(sourcesStart + '**Sources**'.length);
  const sourceChunks = sourceBlock.split(/(?=^\*\*\d+\.\*\*)/m).filter(chunk => /^\*\*\d+\.\*\*/.test(chunk.trimStart()));
  const sources = sourceChunks.map(chunk => {
    const lines = chunk.trim().split(/\r?\n/);
    const citationLine = lines[0].replace(/<br>\s*$/, '').replace(/^\*\*\d+\.\*\*\s*/, '').trim();
    const linkLine = lines.find(line => /^\[[^\]]+\]\(https?:\/\//.test(line.trim()));
    const link = linkLine ? markdownLink(linkLine.trim()) : null;
    const number = Number(lines[0].match(/^\*\*(\d+)\.\*\*/)?.[1]);
    return link ? { number, citation: citationLine, url: link.url } : null;
  }).filter(Boolean);

  if (!species || !cueType || !confidence || !plainWords || !sources.length) {
    throw new Error(`Could not fully parse dictionary entry "${name}" (${id}).`);
  }
  return {
    id,
    species,
    name,
    cueType,
    status: confidence[1],
    confidence: Number(confidence[2]),
    evidenceSummary: block.slice(block.indexOf(confidence[0]) + confidence[0].length).split(/\r?\n\s*\r?\n/)[1]?.trim() ?? '',
    plainWords,
    whatItCanMean: section(block, 'What it can mean'),
    context: section(block, 'Context'),
    whatToDo: section(block, 'What to do'),
    related: [...relatedLine.matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)].map(match => ({ name: match[1], id: match[2] })),
    notes,
    sources,
  };
}

const source = readFileSync(resolve(inputPath), 'utf8');
const anchors = [...source.matchAll(/^<a id="([^"]+)"><\/a>\s*\r?\n### (.+)\r?\n([\s\S]*?)(?=^<a id=|^### AI illustrations)/gm)];
const entries = anchors.map(match => parseEntry(match[1], match[2].trim(), match[3]));
const ids = new Set(entries.map(entry => entry.id));
const unresolved = entries.flatMap(entry => entry.related.filter(related => !ids.has(related.id)).map(related => `${entry.id} -> ${related.id}`));
if (entries.length !== 102 || entries.filter(entry => entry.species === 'cat').length !== 49 || entries.filter(entry => entry.species === 'dog').length !== 53) {
  throw new Error(`Expected 102 entries (49 cats, 53 dogs); parsed ${entries.length}.`);
}
if (unresolved.length) throw new Error(`Unresolved related cues: ${unresolved.join(', ')}`);
if (entries.some(entry => !entry.whatItCanMean || !entry.context || !entry.whatToDo || !entry.sources.length)) {
  throw new Error('One or more entries are missing required content or source links.');
}

const output = `// Generated from the supplied body-language dictionary. Run scripts/import-body-language.mjs to refresh.\nimport type { BodyLanguageEntry } from './bodyLanguage';\nexport const BODY_LANGUAGE_DATA: BodyLanguageEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
writeFileSync(resolve(outputPath), output, 'utf8');
console.log(`Imported ${entries.length} entries and ${entries.reduce((count, entry) => count + entry.sources.length, 0)} cited source links.`);
