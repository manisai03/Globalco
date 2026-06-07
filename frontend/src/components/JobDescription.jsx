function stripBold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function parseSections(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let hero = null;
  let meta = [];
  let currentSection = null;

  for (const line of lines) {
    const heroMatch = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (heroMatch) {
      hero = { title: heroMatch[1], company: heroMatch[2] };
      continue;
    }

    const metaMatch = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (metaMatch) {
      meta.push({ label: metaMatch[1], value: metaMatch[2] });
      continue;
    }

    const sectionMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (sectionMatch) {
      if (currentSection) blocks.push(currentSection);
      currentSection = { title: sectionMatch[1], bullets: [], paragraphs: [] };
      continue;
    }

    const bulletMatch = line.match(/^[•\-*]\s+(.+)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    const content = bulletMatch?.[1] || numberedMatch?.[1];

    if (content) {
      if (!currentSection) {
        currentSection = { title: null, bullets: [], paragraphs: [] };
      }
      currentSection.bullets.push(stripBold(content));
    } else {
      if (!currentSection) {
        currentSection = { title: null, bullets: [], paragraphs: [] };
      }
      currentSection.paragraphs.push(stripBold(line));
    }
  }

  if (currentSection) blocks.push(currentSection);
  return { hero, meta, blocks };
}

export default function JobDescription({ text }) {
  if (!text) return <p className="text-sm text-slate-500">No description provided.</p>;

  const { hero, meta, blocks } = parseSections(text);

  if (!hero && meta.length === 0 && blocks.length === 0) {
    return (
      <div className="space-y-3 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
        {text.split('\n').filter(Boolean).map((line, i) => (
          <p key={i} className="rounded-lg bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">{stripBold(line.trim())}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hero && (
        <div className="rounded-xl bg-gradient-to-r from-primary-50 to-slate-50 px-5 py-4 dark:from-primary-950/30 dark:to-slate-800/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{hero.title}</h3>
          <p className="mt-1 text-primary-700 dark:text-primary-400">{hero.company}</p>
        </div>
      )}

      {meta.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {meta.map((m) => (
            <span key={m.label} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="font-medium text-slate-500">{m.label}:</span>{' '}
              <span className="text-slate-800 dark:text-slate-200">{m.value}</span>
            </span>
          ))}
        </div>
      )}

      {blocks.map((section, idx) => (
        <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/30">
          {section.title && (
            <h4 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">{section.title}</h4>
          )}
          {section.paragraphs.map((p, i) => (
            <p key={i} className="mb-3 text-[15px] leading-7 text-slate-600 last:mb-0 dark:text-slate-300">{p}</p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="space-y-2">
              {section.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
