# Portfolio User Guide

How to update your portfolio at **https://sbilalahmad.github.io**: everyday content edits through the admin panel, plus the occasional code change.

---

## Contents

1. [How the site works](#1-how-the-site-works)
2. [First-time setup: get your access token](#2-first-time-setup-get-your-access-token)
3. [Signing in to the admin panel](#3-signing-in-to-the-admin-panel)
4. [Editing each section](#4-editing-each-section)
5. [Adding a new project (with an image)](#5-adding-a-new-project-with-an-image)
6. [Formatting text](#6-formatting-text)
7. [Publishing: when do changes go live?](#7-publishing-when-do-changes-go-live)
8. [Editing on your computer (optional)](#8-editing-on-your-computer-optional)
9. [Changing things that aren't in the admin panel](#9-changing-things-that-arent-in-the-admin-panel)
10. [Troubleshooting](#10-troubleshooting)
11. [Keeping your account safe](#11-keeping-your-account-safe)
12. [Where everything lives](#12-where-everything-lives)

---

## 1. How the site works

- The website's files are stored in your GitHub repository: **https://github.com/Sbilalahmad/Sbilalahmad.github.io**
- All text content (profile, projects, experience, skills and so on) lives in small data files in `src/content/`.
- The **admin panel** at **https://sbilalahmad.github.io/admin/** gives you forms to edit those files. You never edit code.
- When you click **Save**, the change is saved to GitHub, and GitHub automatically rebuilds and republishes the site in about a minute.

```
You edit in /admin  →  saved to GitHub  →  site rebuilds automatically  →  live in ~1 minute
```

---

## 2. First-time setup: get your access token

The admin panel signs in with a **personal access token**: a password-like key that only allows editing this one website.

1. Sign in to GitHub and open **https://github.com/settings/personal-access-tokens/new**
   (or: profile picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**).
2. Fill in:
   - **Token name:** `Portfolio admin`
   - **Expiration:** e.g. 1 year (you'll need a new token when it expires)
   - **Repository access:** choose **Only select repositories** → pick **Sbilalahmad/Sbilalahmad.github.io**
   - **Permissions → Repository permissions → Contents:** **Read and write**
     (Leave everything else as it is. "Metadata: Read" is added automatically.)
3. Click **Generate token** and **copy the token right away**. GitHub shows it only once.
4. Store it somewhere safe, such as a password manager.

---

## 3. Signing in to the admin panel

1. Open **https://sbilalahmad.github.io/admin/**
2. Click **Sign In Using Access Token**.
3. Paste your token and confirm.

Your browser remembers you, so next time you go straight to the dashboard.

> Ignore the **Sign In with GitHub** button. It needs extra server setup that this site doesn't use; the token method replaces it.

---

## 4. Editing each section

In the admin panel, open **Site content** in the left sidebar. You'll see one entry per section:

| Admin entry | What it changes on the site |
|---|---|
| **Profile, hero & about** | Name, email, location, profile photo, GitHub username, the "Open to AI/ML roles" badge (on/off), rotating titles in the hero (e.g. "AI/ML Engineer"), the hero intro paragraph, the About paragraphs, the *quick_facts.json* card, social links |
| **Projects** | All project cards in the *Things I've built* section |
| **Experience** | The timeline in *Where I've contributed* |
| **Skills** | The *Toolkit* cards **and** the scrolling skills strip under the hero |
| **Highlight numbers** | The four counters under the hero (e.g. "25 Public repos") |
| **Education & certifications** | Degrees and the certifications list |
| **AI twin chat** | The questions and answers in *Ask my AI twin* |

### General editing tips

- **Lists** (projects, roles, skills, bullet points and so on):
  - **Add**: the **+ Add** button at the bottom of the list.
  - **Remove**: the **⋮ / trash** menu on an item.
  - **Reorder**: drag an item by its handle. Order in the admin = order on the site.
- **Saving:** click **Save** (top right). Nothing changes on the site until you save.
- **Undo a mistake before saving:** leave the page without saving and discard the changes.

### Section notes

**Profile, hero & about**
- **Profile photo**: upload a square image (at least 300×300 px), or paste an image link.
- **Show "Open to AI/ML roles" badge**: turn off once you've accepted a job. This also changes the quick-facts status line to `available_for_hire = false`.
- **Rotating hero titles**: keep each one short (2–4 words) so it fits on phones.
- **About paragraphs**: three short paragraphs read best.

**Experience**
- Keep the **newest role at the top**.
- **Dates** are free text, e.g. `Jan 2026 – Apr 2026` or `Jun 2026 – Present`.
- **Tags** are optional; leave the list empty to hide them.

**Highlight numbers**
- Exactly **four** looks best on desktop (they sit in one row).
- **Suffix** is optional, e.g. `+` turns `200` into `200+`.

**AI twin chat**
- Answers appear word by word, as if typed by an AI. Keep each answer to 2–4 sentences.
- The site labels this chat as a "scripted demo", so write the answers in your own voice.

---

## 5. Adding a new project (with an image)

1. Open **Site content → Projects**.
2. Click **+ Add Project** at the bottom of the list.
3. Fill in:

   | Field | Example | Notes |
   |---|---|---|
   | **Title** | `Resume Parser Agent` | Short name |
   | **Tag line** | `Featured · Agentic AI` | Shown small above the title. Start with `Featured ·` for your best work |
   | **Description** | One or two sentences on what it does and why it matters | Mention the result if you have one ("cut review time by 40%") |
   | **Screenshot / cover image** | Upload a PNG/JPG | Optional. Shown at the top of the card in a **16:9** frame. 1280×720 px is ideal |
   | **Tech stack** | `Python`, `FastAPI`, `LangChain` | One item per technology |
   | **Filter categories** | AI / ML | Decides which filter button (AI / ML, Mobile, Product Design) shows the project. Pick one or more |
   | **Link** | `https://github.com/Sbilalahmad/resume-parser` | GitHub repo or live demo. Adds the ↗ button |
   | **Note when there is no link** | `Private design project` | Only used if you leave Link empty |

4. **Drag** the project to where you want it. Projects at the top of the list appear first.
5. Click **Save**. The project appears on the site in about a minute.

**Image tips:** compress screenshots before uploading (e.g. with https://squoosh.app) to keep the site fast. Aim for under 300 KB per image.

---

## 6. Formatting text

In the **Hero intro** and **About paragraphs**, you can make words bold by wrapping them in double asterisks:

```
I build **agentic AI** and **machine learning** systems.
```

shows as: I build **agentic AI** and **machine learning** systems.

Other formatting (italics, links, headings) isn't supported in those fields. Plain text everywhere else.

---

## 7. Publishing: when do changes go live?

- After **Save**, the site updates in **about 1 minute**.
- To watch progress, open **https://github.com/Sbilalahmad/Sbilalahmad.github.io/actions**:
  - 🟡 yellow = building
  - ✅ green = live
  - ❌ red = something went wrong (see [Troubleshooting](#10-troubleshooting))
- If the site still looks old, do a **hard refresh**: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac).

---

## 8. Editing on your computer (optional)

Use this if you want to preview changes before publishing, or to work offline.

**One-time setup:** install **Node.js 22** or newer (https://nodejs.org), then in a terminal:

```bash
cd "Bilal Portfolio"
npm install
```

**Each time:**

```bash
git pull            # get any changes you made through the online admin
npm run dev         # start the local preview
```

- Site preview: **http://localhost:5173**
- Local admin: **http://localhost:5173/admin/index.html** → choose **Work with Local Repository** → select the `Bilal Portfolio` folder (works in Chrome or Edge).

Local edits change the files on your computer only. Publish them with:

```bash
git add .
git commit -m "Describe your change"
git push
```

> **Always `git pull` before you start.** If you edit online and locally without pulling, `git push` will be rejected. Running `git pull` and then `git push` again fixes it.

---

## 9. Changing things that aren't in the admin panel

These are part of the code, not the content files:

| What | File |
|---|---|
| Colours (light & dark theme) | `src/styles.css`: the colour values at the very top (`:root` is dark mode, `:root[data-theme="light"]` is light mode) |
| Section headings & subtitles (e.g. "Agents at work") | `src/App.tsx` |
| Animated demos: agent tasks, RAG walkthroughs, training terminal, idea network | `src/components/AgentSystem.tsx`, `RagPipelines.tsx`, `TrainingTerminal.tsx`, `IdeaNetwork.tsx` |
| Hero 3D brain / circuit background | `src/components/NeuralBrain.tsx`, `Circuit.tsx` |
| Page title & search/social preview text | `index.html` |
| Admin panel fields | `public/admin/config.yml` |

After editing code, check it still builds before pushing:

```bash
npm run build
```

If it prints `✓ built`, it's safe to `git push`.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Admin says the token is invalid | The token expired or lacks permission. Create a new one ([section 2](#2-first-time-setup-get-your-access-token)) with **Contents: Read and write** on **Sbilalahmad.github.io**, then sign in again |
| Saved, but the site didn't change | Wait 1–2 minutes, then hard refresh (`Ctrl + Shift + R`). Check the Actions page for a green tick |
| The Actions run is red ❌ | Open the failed run to see the error. Usually a field was left in an odd state. Undo the last edit in the admin and save again, or check the error in the run log |
| `git push` says "rejected" / "fetch first" | You edited online since your last pull. Run `git pull`, then `git push` |
| A project image looks cropped | Images are shown at 16:9. Use a 1280×720 screenshot, or crop to that ratio before uploading |
| The 3D brain takes a moment to appear | Normal on slower connections; it's a large download that loads after the rest of the page |
| Admin panel is blank | Hard refresh. The panel loads from the internet (unpkg.com), so check your connection or try another browser |

---

## 11. Keeping your account safe

- **Never share your access token** or paste it into chats, emails or code. Anyone with it can edit your site.
- If it leaks: GitHub → **Settings → Developer settings → Personal access tokens** → **Delete** it, then create a new one.
- Use a **fine-grained** token limited to this one repository (as in section 2), not a token for your whole account.
- Personal files such as `Profile.pdf` (phone number and address) are deliberately **excluded** from the public repository by `.gitignore`. Don't remove those lines.
- The repository is **public**: anything you commit can be seen by anyone. Don't put private information in content files.

---

## 12. Where everything lives

```
Bilal Portfolio/
├── src/content/            ← all editable content (what the admin panel changes)
│   ├── profile.json        ← name, photo, hero, about, quick facts, socials
│   ├── projects.json
│   ├── experience.json
│   ├── skills.json
│   ├── stats.json          ← highlight numbers
│   ├── education.json      ← degrees + certifications
│   └── ai_twin.json
├── public/
│   ├── admin/              ← admin panel (index.html + config.yml)
│   └── uploads/            ← images uploaded through the admin
├── src/components/         ← interactive parts (brain, agents, RAG, etc.)
├── src/App.tsx             ← page layout and section headings
├── src/styles.css          ← colours, fonts, layout
├── .github/workflows/      ← automatic build & publish
└── user_guide.md           ← this guide
```

**Useful links**

- Live site: https://sbilalahmad.github.io
- Admin panel: https://sbilalahmad.github.io/admin/
- Repository: https://github.com/Sbilalahmad/Sbilalahmad.github.io
- Build status: https://github.com/Sbilalahmad/Sbilalahmad.github.io/actions
- Create token: https://github.com/settings/personal-access-tokens/new
