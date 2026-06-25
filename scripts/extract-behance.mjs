import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.cwd();
const cacheDir = join(root, "source-cache");
const outDir = join(root, "assets", "images", "behance");
const dataDir = join(root, "src", "data");

await mkdir(outDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

function extractStore(html) {
  const match = html.match(/<script type="application\/json" id="beconfig-store_state">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Cannot find Behance store JSON.");
  return JSON.parse(match[1]);
}

function bestImage(images = []) {
  if (!Array.isArray(images) || images.length === 0) return "";
  const byPreference = [...images].sort((a, b) => {
    const aw = a.width ?? 9999;
    const bw = b.width ?? 9999;
    const typeScore = (img) => (img.type === "JPG" || img.type === "PNG" ? 0 : 1);
    return typeScore(a) - typeScore(b) || bw - aw;
  });
  return byPreference[0]?.url || "";
}

function findProjects(value, found = new Map()) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) findProjects(item, found);
    return found;
  }
  if (
    value.__typename === "Project" &&
    value.id &&
    value.name &&
    value.url &&
    value.covers?.allAvailable
  ) {
    found.set(value.id, value);
  }
  for (const child of Object.values(value)) findProjects(child, found);
  return found;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function pickLines(text, title) {
  const lines = [...new Set(text.split(/\n+/).map((line) => line.trim()).filter(Boolean))];
  const start = Math.max(0, lines.findIndex((line) => line.includes(title)) + 1);
  const blocked = /^(Sign In|Follow|Following|Unfollow|Hire|Tools|Share|Save|Appreciate|Owner|Published:|More Behance|Join Behance|Adobe|Report|Explore|Jobs|Resources|Blog|About Behance|Adobe Portfolio|English|Download on the App Store|Get it on Google Play|Careers at Behance|Add to Moodboard|Share & Embed This Project|Full Time Job|Freelance Job|Availability:.*)$/i;
  return lines
    .slice(start, start + 80)
    .filter((line) => line.length > 3 && !blocked.test(line) && !/^[\d\s]+$/.test(line) && !line.includes("中文(简体)"))
    .slice(0, 10);
}

function safeName(project, index, url) {
  const extension = extname(new URL(url).pathname).split("?")[0] || ".jpg";
  return `${String(index + 1).padStart(2, "0")}-${project.slug || project.id}${extension}`.replace(/[<>:"/\\|?*]/g, "-");
}

const profileFiles = ["behance-profile.html", "behance-profile-page2.html"];
const stores = [];
for (const file of profileFiles) {
  stores.push(extractStore(await readFile(join(cacheDir, file), "utf8")));
}

const rawProjects = new Map();
for (const store of stores) {
  for (const [id, project] of findProjects(store)) rawProjects.set(id, project);
}

const projects = [];
for (const project of [...rawProjects.values()].sort((a, b) => b.publishedOn - a.publishedOn)) {
  const coverUrl = bestImage(project.covers?.allAvailable);
  const fileName = coverUrl ? safeName(project, projects.length, coverUrl) : "";
  const localCover = fileName ? `assets/images/behance/${fileName}` : "";
  projects.push({
    id: project.id,
    title: project.name,
    slug: project.slug,
    sourceUrl: project.url,
    publishedOn: project.publishedOn,
    year: new Date(project.publishedOn * 1000).getFullYear(),
    category: inferCategory(project.name),
    tags: project.features?.map((feature) => feature.name).filter(Boolean) ?? [],
    stats: {
      appreciations: project.stats?.appreciations?.all ?? 0,
      views: project.stats?.views?.all ?? 0,
    },
    dominantColor: project.colors || null,
    coverUrl,
    localCover,
    summary: "",
    details: [],
  });
}

function inferCategory(title) {
  const value = title.toLowerCase();
  if (value.includes("landing") || value.includes("web") || value.includes("銷售頁")) return "Web Design";
  if (value.includes("logo") || value.includes("vi") || value.includes("brand")) return "Brand Identity";
  if (value.includes("packaging") || value.includes("包裝")) return "Packaging";
  if (value.includes("photo") || value.includes("攝影")) return "Photography";
  if (value.includes("banner") || value.includes("illustration")) return "Visual Design";
  return "Graphic Design";
}

for (const project of projects) {
  const file = join(cacheDir, `project-${project.id}.html`);
  try {
    const text = htmlToText(await readFile(file, "utf8"));
    const lines = pickLines(text, project.title);
    project.details = lines;
    project.summary = lines.find((line) => line !== project.title && !/^\d+$/.test(line)) || `${project.category} work published on Behance.`;
  } catch {
    project.summary = `${project.category} work published on Behance.`;
  }
}

await writeFile(join(dataDir, "behance-projects.json"), JSON.stringify(projects, null, 2), "utf8");
await writeFile(join(dataDir, "behance-image-urls.txt"), projects.map((project) => `${project.localCover}\t${project.coverUrl}`).join("\n"), "utf8");

console.log(JSON.stringify({ count: projects.length, projects: projects.map((project) => project.title) }, null, 2));
