export const profile = {
  name: "Syed Bilal Ahmad",
  email: "syedbilalahmad397@gmail.com",
  location: "Aligarh, Uttar Pradesh, India",
  avatar: "https://avatars.githubusercontent.com/u/181249646?v=4",
  roles: [
    "AI/ML Engineer",
    "Agentic AI Developer",
    "Neural Network Tinkerer",
    "GenAI Enthusiast",
    "Android Developer",
  ],
};

export const socials = {
  github: "https://github.com/Sbilalahmad",
  linkedin: "https://www.linkedin.com/in/syed-bilal-ahmad-454468203",
  medium: "https://medium.com/@syedbilalahmad397",
  stackoverflow: "https://stackoverflow.com/users/29562515/syed-bilal-ahmad",
  orcid: "https://orcid.org/0009-0005-1574-3231",
};

export const stats = [
  { value: 25, label: "Public repos" },
  { value: 200, suffix: "+", label: "Hackers supported at AMUHACKS 4.0" },
  { value: 6, label: "Leadership & industry roles" },
  { value: 5, label: "Certifications" },
];

export const quickFacts: [string, string][] = [
  ["role", "AI/ML Engineer (Fresher)"],
  ["education", "MCA, Aligarh Muslim University '26"],
  ["location", "Aligarh, Uttar Pradesh, India"],
  ["focus", "GenAI · Agentic AI · ML · Android"],
  ["interests", "RLHF · Ethical AI · Automation · Cloud"],
];

export const skills = [
  { title: "Machine Learning & Data", items: ["PyTorch", "TensorFlow", "scikit-learn", "NumPy", "Pandas", "Matplotlib", "Statistical Data Analysis", "Model Evaluation"] },
  { title: "Generative & Agentic AI", items: ["Agentic AI Development", "Salesforce Agentforce", "Einstein AI", "Prompt Engineering", "RLHF", "Dialogflow", "FastAPI"] },
  { title: "Languages", items: ["Python", "C++", "Java", "Kotlin", "Dart", "SQL", "MATLAB"] },
  { title: "Salesforce Platform", items: ["Apex", "Lightning Web Components", "Aura", "SOQL / SOSL", "Flows", "Security Model"] },
  { title: "Mobile & Backend", items: ["Android (Kotlin)", "Gradle", "Apache Maven", "MySQL", "PostgreSQL", "SQLite"] },
  { title: "Tools & Environment", items: ["Linux (Arch · Ubuntu · Kali)", "Bash", "Git & GitHub", "VS Code", "Google Colab", "Kaggle", "Agile"] },
];

export type Experience = {
  role: string;
  org: string;
  date: string;
  points: string[];
  tags?: string[];
};

export const experience: Experience[] = [
  {
    role: "Salesforce & AI Developer Intern",
    org: "Infoglen · Gurugram",
    date: "Jun 2026",
    points: [
      "Designed autonomous agents, smart workflows and predictive solutions with Salesforce Agentforce and Einstein features.",
      "Built custom business logic in Apex (triggers, classes, async processing) and responsive UIs with Lightning Web Components.",
      "Wrote efficient SOQL/SOSL queries to manage and optimize complex data models.",
      "Collaborated with developers, architects and BAs in an agile team to ship scalable digital transformations.",
    ],
    tags: ["Agentforce", "Apex", "LWC", "SOQL", "Agile"],
  },
  {
    role: "Salesforce Development & Admin Trainee",
    org: "Infoglen · Aligarh",
    date: "Jan 2026 – Apr 2026",
    points: [
      "Hands-on training across Apex, Triggers, Flows, LWC, Aura, SOQL, DML and Lightning App Builder.",
      "Covered the Salesforce security model, deployment strategies, SDLC and Salesforce AI fundamentals.",
    ],
  },
  {
    role: "AI/ML Lead (Mentor)",
    org: "Computer Science Society, AMU · Aligarh",
    date: "Sep 2025 – Jan 2026",
    points: [
      "Mentored peers on data preprocessing, model development, evaluation and practical ML implementation.",
      "Organized workshops, technical sessions and hands-on training bridging theory and real-world application.",
      "Guided student projects and encouraged participation in hackathons and coding competitions.",
    ],
  },
  {
    role: "Students Coordinator (HR Team)",
    org: "Training & Placement Cell, Dept. of Computer Science, AMU",
    date: "Aug 2025 – Jun 2026",
    points: [
      "Coordinated campus placements and supported training initiatives for students.",
      "Strengthened industry–academia relations by working with recruiters and alumni.",
    ],
  },
  {
    role: "Mentor — AI & ChatGPT Certificate Course",
    org: "Image Classes · Aligarh",
    date: "May 2025 – Oct 2025",
    points: [
      "Taught school students AI fundamentals, prompt engineering and real-world AI use cases.",
      "Guided mini-projects so learners could apply concepts hands-on.",
    ],
  },
  {
    role: "AI/ML Intern & Tech Team Lead",
    org: "Computer Science Society, AMU · Aligarh",
    date: "Jan 2025 – May 2025",
    points: [
      "Led technical infrastructure for AMUHACKS 4.0, the society's flagship hackathon with 200+ participants.",
      "Configured Google Workspace (Gmail, Drive, Forms, Calendar) to automate registrations and communications.",
      "Led a cross-functional tech team, resolving access management and live issues for a glitch-free event.",
    ],
  },
];

export type ProjectCat = "ai" | "mobile" | "design";

export type Project = {
  title: string;
  tag: string;
  desc: string;
  tech: string[];
  cats: ProjectCat[];
  url?: string;
  note?: string;
};

export const projects: Project[] = [
  {
    title: "Tfi Text Extractor",
    tag: "Featured · Computer Vision",
    desc: "Android app that extracts text from gallery images and live camera captures, turning photos of documents, notes and signs into editable, shareable text.",
    tech: ["Kotlin", "Android", "OCR", "Camera API"],
    cats: ["ai", "mobile"],
    url: "https://github.com/Sbilalahmad/Tfi_Text_Extractor",
  },
  {
    title: "Sight for Blinds",
    tag: "Featured · Assistive AI",
    desc: "Assistive technology project aimed at helping visually impaired users perceive the world around them — technology built with purpose.",
    tech: ["C++", "Assistive Tech", "Accessibility"],
    cats: ["ai"],
    url: "https://github.com/Sbilalahmad/Sight-for-Blinds",
  },
  {
    title: "AI/ML Mentorship",
    tag: "Education · ML",
    desc: "Teaching repository of Jupyter notebooks covering ML fundamentals, created while mentoring students as AI/ML Lead at the Computer Science Society.",
    tech: ["Python", "Jupyter", "scikit-learn", "Pandas"],
    cats: ["ai"],
    url: "https://github.com/Sbilalahmad/AI_ML_mentorship",
  },
  {
    title: "Agentforce Workflows",
    tag: "Enterprise AI",
    desc: "Autonomous agents and predictive, AI-driven workflows on Salesforce built during my Infoglen internship, combining Agentforce, Einstein, Apex and LWC.",
    tech: ["Agentforce", "Einstein", "Apex", "LWC"],
    cats: ["ai"],
    note: "Internship work",
  },
  {
    title: "AgentForge",
    tag: "Product Design · 20 screens",
    desc: "Desktop wireframe specification for an AI-agent building platform, designed in a dark \"Obsidian Forge\" theme with the Geist typeface.",
    tech: ["Google Stitch", "UI/UX", "AI Agents"],
    cats: ["design", "ai"],
    note: "Private design project",
  },
  {
    title: "Zambyl Meeting Intelligence",
    tag: "Product Design · 10 screens",
    desc: "Desktop UI for a meeting-intelligence platform, with a custom light design system built on Geist, Inter and JetBrains Mono.",
    tech: ["Google Stitch", "Design System", "GenAI UX"],
    cats: ["design", "ai"],
    note: "Private design project",
  },
  {
    title: "Login & Sign-up",
    tag: "Android",
    desc: "Facebook-style authentication flow for Android with login and sign-up screens.",
    tech: ["Kotlin", "Android", "Auth UI"],
    cats: ["mobile"],
    url: "https://github.com/Sbilalahmad/Login_and_Sign_up",
  },
  {
    title: "StopWatch",
    tag: "Android",
    desc: "Simple, clean Android stopwatch sample app with start, pause and reset controls.",
    tech: ["Kotlin", "Android"],
    cats: ["mobile"],
    url: "https://github.com/Sbilalahmad/My_StropWatch",
  },
];

export const education = [
  { years: "2024 – 2026", degree: "Master of Computer Applications (MCA)", school: "Aligarh Muslim University" },
  { years: "2020 – 2023", degree: "Bachelor's Degree, Mathematics", school: "Aligarh Muslim University" },
];

export const certifications = [
  "Machine Learning with Python",
  "AI Agents Fundamentals",
  "Data Analyst",
  "Deloitte Australia — Technology Job Simulation",
  "AI Appreciate Badge — AI For All",
];
