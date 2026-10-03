import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  certifications,
  education,
  experience,
  profile,
  projects,
  quickFacts,
  skills,
  socials,
  stats,
  type ProjectCat,
} from "./data";
import { ThemeContext, useTheme, useThemeState } from "./hooks";
import { Reveal, SpotlightCard } from "./components/Primitives";
import { CountUp, DecryptedText, TypeCycle } from "./components/TextEffects";
import Circuit from "./components/Circuit";
import IdeaNetwork from "./components/IdeaNetwork";
import TrainingTerminal from "./components/TrainingTerminal";
import Globe from "./components/Globe";
import AgentSystem from "./components/AgentSystem";
import GenAIChat from "./components/GenAIChat";
import Marquee from "./components/Marquee";
import RagPipelines from "./components/RagPipelines";
import * as I from "./components/Icons";

// three.js is the heaviest dependency; load it after first paint
const NeuralBrain = lazy(() => import("./components/NeuralBrain"));

/** Renders **bold** markup from the CMS as <strong>. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
      )}
    </>
  );
}

const NAV = [
  ["about", "About"],
  ["skills", "Skills"],
  ["lab", "Lab"],
  ["agents", "Agents"],
  ["rag", "RAG"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["contact", "Contact"],
] as const;

function SectionHead({
  n,
  kicker,
  title,
  sub,
  takeaway,
  center,
}: {
  n: string;
  kicker: string;
  title: ReactNode;
  sub?: string;
  takeaway?: string;
  center?: boolean;
}) {
  return (
    <Reveal as="header" className={`sec-head ${center ? "center" : ""}`}>
      <p className="mono kicker">
        {n} · {kicker}
      </p>
      <h2>{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
      {takeaway && <p className="takeaway">{takeaway}</p>}
    </Reveal>
  );
}

function Nav() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main section[id]").forEach((s) => obs.observe(s));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
      obs.disconnect();
    };
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <a href="#home" className="logo" aria-label="Home">
          <span className="logo-mark">SB</span>
          <span className="logo-text">
            bilal<span className="accent">.ai</span>
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className={`nav-links ${open ? "open" : ""}`} id="navLinks">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={active === id ? "active" : ""} onClick={() => setOpen(false)}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" onClick={toggle} aria-label="Toggle color theme" title="Toggle theme">
            {theme === "light" ? <I.Sun /> : <I.Moon />}
          </button>
          <button
            className="icon-btn menu-btn"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="navLinks"
            onClick={() => setOpen((o) => !o)}
          >
            <I.Menu />
          </button>
        </div>
      </div>
    </header>
  );
}

function SocialLinks() {
  const links = [
    [socials.github, "GitHub", I.GitHub],
    [socials.linkedin, "LinkedIn", I.LinkedIn],
    [socials.medium, "Medium", I.Medium],
    [socials.stackoverflow, "Stack Overflow", I.StackOverflow],
    [socials.orcid, "ORCID", I.Orcid],
    [`mailto:${profile.email}`, "Email", I.Mail],
  ] as const;
  return (
    <ul className="socials" aria-label="Social links">
      {links.map(([href, label, Icon]) => (
        <li key={label}>
          <a href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noopener" aria-label={label}>
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  );
}

const AVOID = [".hero-copy > *", ".brain", ".nav .logo", ".nav-links", ".nav-actions", ".scroll-hint"];

function Hero() {
  return (
    <section className="hero" id="home">
      <Circuit avoid={AVOID} />
      <div className="container hero-inner">
        <div className="hero-copy">
          {profile.openToWork && (
            <p className="eyebrow mono">
              <span className="pulse" /> Open to AI/ML engineering roles
            </p>
          )}
          <h1>
            Hi, I'm <DecryptedText text={profile.name} className="name-accent" />
          </h1>
          <p className="typed mono" aria-live="polite">
            &gt; <TypeCycle words={profile.roles} />
            <span className="caret">_</span>
          </p>
          <p className="lead">
            <Rich text={profile.heroLead} />
          </p>
          <div className="cta">
            <a href="#projects" className="btn btn-primary">
              View my work <I.Arrow />
            </a>
            <a href="#lab" className="btn btn-ghost">
              Play with the model
            </a>
          </div>
          <SocialLinks />
        </div>
        <div className="hero-visual">
          <Suspense fallback={<div className="brain brain-loading" />}>
            <NeuralBrain />
          </Suspense>
        </div>
      </div>
      <a href="#about" className="scroll-hint" aria-label="Scroll to About section">
        Scroll
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </a>
    </section>
  );
}

function Stats() {
  return (
    <section className="stats-band" aria-label="Highlights">
      <div className="container stats">
        {stats.map((s) => (
          <Reveal key={s.label} className="stat">
            <CountUp to={s.value} suffix={s.suffix} />
            <span className="lbl">{s.label}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SkillMarquee() {
  const all = skills.flatMap((s) => s.items);
  const half = Math.ceil(all.length / 2);
  return (
    <section className="marquee-band" aria-label="Technologies">
      <Marquee items={all.slice(0, half)} duration={45} />
      <Marquee items={all.slice(half)} duration={50} reverse />
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <SectionHead
          n="01"
          kicker="about"
          title={
            <>
              Curious about the <em>why</em> before the <em>how</em>
            </>
          }
        />
        <div className="about-grid">
          <Reveal className="about-text">
            {profile.about.map((para, i) => (
              <p key={i}>
                <Rich text={para} />
              </p>
            ))}
          </Reveal>
          <Reveal as="aside" className="about-card" delay={100}>
            <div className="about-id">
              <img src={profile.avatar} alt={`Portrait of ${profile.name}`} width={64} height={64} className="avatar" />
              <div>
                <strong>{profile.name}</strong>
                <span className="mono">@{profile.githubHandle}</span>
              </div>
            </div>
            <h3 className="mono">quick_facts.json</h3>
            <dl>
              {quickFacts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div>
                <dt>status</dt>
                <dd className="ok">available_for_hire = {String(profile.openToWork)}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className="section alt" id="skills">
      <div className="container">
        <SectionHead
          n="02"
          kicker="skills"
          title="Toolkit"
          sub="Languages, frameworks and platforms I use to take ideas from notebook to product."
        />
        <div className="skills-grid">
          {skills.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 80}>
              <SpotlightCard className="skill-card">
                <div className="skill-ico">{String(i + 1).padStart(2, "0")}</div>
                <h3>{s.title}</h3>
                <ul className="chips">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lab() {
  return (
    <section className="section" id="lab">
      <div className="container">
        <SectionHead
          n="03"
          kicker="lab"
          title="Inside the model"
          sub="Toggle input features to run a forward pass through a small neural network and see which project ideas it ranks highest. Then watch a model train on my profile."
          takeaway="In short: a neural network is layers of weighted connections — change the inputs and the signal, and the ranked output, changes."
        />
        <div className="lab-grid">
          <Reveal>
            <SpotlightCard as="div" className="lab-card">
              <IdeaNetwork />
            </SpotlightCard>
          </Reveal>
          <Reveal delay={120}>
            <TrainingTerminal />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Agents() {
  return (
    <section className="section alt" id="agents">
      <div className="container">
        <SectionHead
          n="04"
          kicker="agents & generative ai"
          title="Agents at work"
          sub="A multi-agent system plans, researches, builds and reviews before anything reaches the user — the kind of agentic workflow I design. Pick a task and watch the agents coordinate."
          takeaway="In short: an orchestrator splits the job across specialist agents, and a critic checks the work before it's returned."
        />
        <Reveal>
          <SpotlightCard as="div" className="lab-card">
            <AgentSystem />
          </SpotlightCard>
        </Reveal>
        <Reveal className="genai-wrap" delay={80}>
          <h3 className="sub-head">Ask my AI twin</h3>
          <GenAIChat />
        </Reveal>
      </div>
    </section>
  );
}

function Rag() {
  return (
    <section className="section" id="rag">
      <div className="container">
        <SectionHead
          n="05"
          kicker="retrieval-augmented generation"
          title="Three ways to ground an LLM"
          sub="Vector RAG, Graph RAG and Agentic RAG, animated step by step over a small knowledge base built from my profile. Pick a strategy, then play or step through the pipeline."
        />
        <Reveal>
          <div className="lab-card">
            <RagPipelines />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Experience() {
  return (
    <section className="section alt" id="experience">
      <div className="container">
        <SectionHead n="06" kicker="experience" title="Where I've contributed" />
        <ol className="timeline">
          {experience.map((e) => (
            <Reveal as="li" key={e.role + e.date} className="tl-item">
              <div className="tl-dot" />
              <div className="tl-card">
                <div className="tl-top">
                  <h3>{e.role}</h3>
                  <span className="tl-date mono">{e.date}</span>
                </div>
                <p className="tl-org">{e.org}</p>
                <ul className="tl-points">
                  {e.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {e.tags && (
                  <ul className="chips sm">
                    {e.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FILTERS: [ProjectCat | "all", string][] = [
  ["all", "All"],
  ["ai", "AI / ML"],
  ["mobile", "Mobile"],
  ["design", "Product Design"],
];

function Projects() {
  const [filter, setFilter] = useState<ProjectCat | "all">("all");
  const shown = projects.filter((p) => filter === "all" || p.cats.includes(filter));
  return (
    <section className="section" id="projects">
      <div className="container">
        <SectionHead
          n="07"
          kicker="projects"
          title="Things I've built"
          sub="A selection of open-source work and product design explorations."
        />
        <Reveal className="filters" role="group" aria-label="Filter projects">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              className={`chip-btn ${filter === id ? "on" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </Reveal>
        <div className="projects-grid">
          {shown.map((p) => (
            <SpotlightCard key={p.title} className="project">
              <div className="p-head">
                <span className="p-tag">{p.tag}</span>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener" aria-label={`${p.title} on GitHub`} className="p-link">
                    ↗
                  </a>
                ) : (
                  <span className="p-link muted" title={p.note}>
                    ◆
                  </span>
                )}
              </div>
              {p.image && <img src={p.image} alt="" className="p-img" loading="lazy" />}
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <ul className="chips sm">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </SpotlightCard>
          ))}
        </div>
        <Reveal className="more">
          <a href={`${socials.github}?tab=repositories`} target="_blank" rel="noopener" className="btn btn-ghost">
            See all repositories on GitHub ↗
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function Education() {
  return (
    <section className="section alt" id="education">
      <div className="container">
        <SectionHead n="08" kicker="education & certifications" title="Foundations" />
        <div className="edu-grid">
          <div className="edu-col">
            {education.map((e) => (
              <Reveal as="article" key={e.degree} className="edu-card">
                <span className="edu-year mono">{e.years}</span>
                <h3>{e.degree}</h3>
                <p>{e.school}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="cert-col" delay={100}>
            <h3 className="cert-title">Certifications</h3>
            <ul className="certs">
              {certifications.map((c) => (
                <li key={c}>
                  <span className="cert-ico">◆</span>
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [note, setNote] = useState<{ text: string; err?: boolean } | null>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const bad: Record<string, boolean> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach((f) => {
      if (!f.checkValidity() || !f.value.trim()) bad[f.name] = true;
    });
    setInvalid(bad);
    if (Object.keys(bad).length) {
      setNote({ text: "Please fill in all fields with a valid email.", err: true });
      return;
    }
    const { name, email, message } = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    setNote({ text: "Opening your email client… thanks for reaching out!" });
    form.reset();
  };

  return (
    <section className="section" id="contact">
      <div className="container contact">
        <SectionHead
          n="09"
          kicker="contact"
          title="Let's build something intelligent"
          sub="Hiring for AI/ML roles, working on something exciting, or just want to swap ideas? My inbox is open."
          center
        />
        <div className="contact-grid">
          <Reveal as="form" className="contact-form" onSubmit={onSubmit} noValidate>
            {[
              ["name", "Name", "text", "name"],
              ["email", "Email", "email", "email"],
            ].map(([id, label, type, ac]) => (
              <div key={id} className={`field ${invalid[id] ? "invalid" : ""}`}>
                <label htmlFor={`cf-${id}`}>{label}</label>
                <input id={`cf-${id}`} name={id} type={type} autoComplete={ac} required />
              </div>
            ))}
            <div className={`field ${invalid.message ? "invalid" : ""}`}>
              <label htmlFor="cf-message">Message</label>
              <textarea id="cf-message" name="message" rows={5} required />
            </div>
            <button type="submit" className="btn btn-primary">
              Send message
            </button>
            <p className={`form-note ${note?.err ? "err" : ""}`} role="status">
              {note?.text}
            </p>
          </Reveal>
          <Reveal className="contact-side" delay={100}>
            <Globe />
            <div className="contact-info">
              <a className="ci" href={`mailto:${profile.email}`}>
                <span className="ci-k mono">email</span>
                <span className="ci-v">{profile.email}</span>
              </a>
              <a className="ci" href={socials.linkedin} target="_blank" rel="noopener">
                <span className="ci-k mono">linkedin</span>
                <span className="ci-v">in/syed-bilal-ahmad</span>
              </a>
              <a className="ci" href={socials.github} target="_blank" rel="noopener">
                <span className="ci-k mono">github</span>
                <span className="ci-v">@{profile.githubHandle}</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const themeState = useThemeState();
  return (
    <ThemeContext.Provider value={themeState}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Stats />
        <SkillMarquee />
        <About />
        <Skills />
        <Lab />
        <Agents />
        <Rag />
        <Experience />
        <Projects />
        <Education />
        <Contact />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <p>
            © {new Date().getFullYear()} {profile.name} · Building tech with purpose.
          </p>
          <a href="#home" className="mono to-top">
            back to top ↑
          </a>
        </div>
      </footer>
    </ThemeContext.Provider>
  );
}
