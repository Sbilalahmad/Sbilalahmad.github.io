/*
 * Site content. The JSON files in ./content are edited through the admin
 * panel (/admin, Sveltia CMS) — change content there, not here. This module
 * only adapts the JSON into the shapes the components use.
 */
import profileJson from "./content/profile.json";
import statsJson from "./content/stats.json";
import skillsJson from "./content/skills.json";
import experienceJson from "./content/experience.json";
import projectsJson from "./content/projects.json";
import educationJson from "./content/education.json";
import aiTwinJson from "./content/ai_twin.json";

export const profile = {
  name: profileJson.name,
  email: profileJson.email,
  location: profileJson.location,
  avatar: profileJson.avatar,
  githubHandle: profileJson.github_handle,
  openToWork: profileJson.open_to_work,
  roles: profileJson.roles,
  heroLead: profileJson.hero_lead,
  about: profileJson.about,
};

export const socials = profileJson.socials;

export const stats = statsJson.items.map((s) => ({ value: Number(s.value), suffix: s.suffix || undefined, label: s.label }));

export const quickFacts: [string, string][] = profileJson.quick_facts.map((f) => [f.key, f.value]);

export const skills: { title: string; items: string[] }[] = skillsJson.groups;

export type Experience = {
  role: string;
  org: string;
  date: string;
  points: string[];
  tags?: string[];
};

export const experience: Experience[] = experienceJson.items.map((e) => ({ ...e, tags: e.tags?.length ? e.tags : undefined }));

export type ProjectCat = "ai" | "mobile" | "design";

export type Project = {
  title: string;
  tag: string;
  desc: string;
  tech: string[];
  cats: ProjectCat[];
  url?: string;
  note?: string;
  image?: string;
};

export const projects: Project[] = projectsJson.items.map((p) => ({
  ...p,
  cats: p.cats as ProjectCat[],
  url: p.url || undefined,
  note: p.note || undefined,
  image: p.image || undefined,
}));

export const education: { years: string; degree: string; school: string }[] = educationJson.degrees;

export const certifications: string[] = educationJson.certifications;

export const aiTwin: { q: string; a: string }[] = aiTwinJson.qa;
