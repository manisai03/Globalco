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
  if (!text) return <p className="text-sm text-muted-foreground">No description provided.</p>;

  const { hero, meta, blocks } = parseSections(text);

  if (!hero && meta.length === 0 && blocks.length === 0) {
    return (
      <div className="space-y-3 text-[15px] leading-7 text-foreground/80">
        {text.split('\n').filter(Boolean).map((line, i) => (
          <p key={i} className="rounded-lg bg-muted/60 px-4 py-2.5">{stripBold(line.trim())}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hero && (
        <div className="rounded-xl bg-gradient-to-r from-accent to-muted/60 px-5 py-4">
          <h3 className="text-xl font-bold">{hero.title}</h3>
          <p className="mt-1 text-primary">{hero.company}</p>
        </div>
      )}

      {meta.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {meta.map((m) => (
            <span key={m.label} className="rounded-lg border bg-card px-3 py-1.5 text-sm">
              <span className="font-medium text-muted-foreground">{m.label}:</span>{' '}
              <span className="text-foreground">{m.value}</span>
            </span>
          ))}
        </div>
      )}

      {blocks.map((section, idx) => (
        <div key={idx} className="rounded-xl border bg-muted/40 p-5">
          {section.title && (
            <h4 className="mb-3 text-base font-semibold">{section.title}</h4>
          )}
          {section.paragraphs.map((p, i) => (
            <p key={i} className="mb-3 text-[15px] leading-7 text-foreground/80 last:mb-0">{p}</p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="space-y-2">
              {section.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-7 text-foreground/80">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
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
