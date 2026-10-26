import '../styles/sim-hero.css';

// Shared laboratory masthead for every simulation page.
// One presentation standard: kicker, display title, intro, resource links,
// optional family strip. Visual spec lives in src/styles/sim-hero.css.
export default function SimHero({ kicker, title, intro, links = [], note, family = [], familyNote }) {
  return (
    <>
      <header class="sim-hero">
        <div class="sim-hero-main">
          {kicker ? <p class="sim-hero-kicker">{kicker}</p> : null}
          <h1 class="sim-hero-title">{title}</h1>
          {intro ? <p class="sim-hero-intro">{intro}</p> : null}
        </div>
        {links.length > 0 || note ? (
          <nav class="sim-hero-links" aria-label="Laboratory resources">
            {links.map((l) => (
              <a href={l.href} key={l.href + l.label}>
                {l.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
            {note ? <span class="sim-hero-note">{note}</span> : null}
          </nav>
        ) : null}
      </header>
      {family.length > 0 ? (
        <nav class="sim-hero-family" aria-label="Laboratory family">
          {family.map((f) =>
            f.current ? (
              <span aria-current="page" key={f.label}>{f.label}</span>
            ) : (
              <a href={f.href} key={f.label}>{f.label}</a>
            )
          )}
          {familyNote ? <span class="sim-hero-family-note">{familyNote}</span> : null}
        </nav>
      ) : null}
    </>
  );
}
