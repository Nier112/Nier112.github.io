import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();
const cacheDir = join(root, "source-cache");
const projectsPath = join(root, "src", "data", "behance-projects.json");
const projects = JSON.parse(await readFile(projectsPath, "utf8"));

async function download(url, file) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 Codex portfolio builder",
      accept: "*/*",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  await mkdir(dirname(file), { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(file, buffer);
  return buffer.length;
}

const results = [];
for (const project of projects) {
  const htmlFile = join(cacheDir, `project-${project.id}.html`);
  const imageFile = join(root, project.localCover);
  const htmlBytes = await download(project.sourceUrl, htmlFile);
  const imageBytes = project.coverUrl ? await download(project.coverUrl, imageFile) : 0;
  results.push({ id: project.id, title: project.title, htmlBytes, imageBytes });
}

console.log(JSON.stringify(results, null, 2));
