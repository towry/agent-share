#!/usr/bin/env bun
// Build the Honcho skill index that the `find-hot-skill` plugin searches.
//
// The library is this repository's `skills/` directory. Each record stores
// `skills/<name>/SKILL.md` plus the git SHA of this repo. The find-hot-skill
// plugin searches Honcho and loads bodies from a local cache of this tree,
// not from the Amp plugin bundle.
//
// Each skill contributes one record carrying its name and description, plus —
// for the abstract `principle-*` skills, and any other skill that checks in
// `examples.txt` next to `SKILL.md` — one record per example task.
//
// The example records are doc2query. An abstract rule ("avoid over-engineering")
// shares no vocabulary with the task that needs it, so a description-only index
// misses it. Measured over the 21 `principle-*` skills against held-out tasks,
// example records lifted distinct-skill recall@5 from 10/21 to 15/21 and recall@20
// from 16/21 to 21/21; a control that shuffled the examples across principles fell
// back to baseline. One example per record: concatenating them measured worse.
//
// Those tasks are authored data, not produced at index time. Refresh them with
// `bun scripts/generate-skill-examples.ts` after a principle skill's body changes
// enough that the checked-in tasks no longer look like the work the rule applies to.
//
// Honcho cannot delete or edit a single message, so a rebuild cannot replace the
// previous index record by record. Deleting the whole session is asynchronous:
// it marks the session inactive at once, rejects its id until the background
// cascade finishes, and gives no way to wait for that finish. Instead each build
// stamps its records with a fresh build id and then repoints the session metadata
// at it. The plugin searches with `filters: {metadata: {build: <id>}}`, so records
// from earlier builds stay in the session but are never returned.
//
//   AMPCODE_HONCHO_API_KEY=... AMPCODE_HONCHO_WORKSPACE_ID=... bun scripts/index-skills.ts
//
// Refuses to publish a build containing `principle-*` skills when `examples.txt`
// is missing or shorter than 8 tasks: a description-only index retrieves those
// measurably worse than the build it would replace, so failing here leaves the
// old one live. Other skills may check in `examples.txt` the same way; a present
// file is indexed and must have at least 8 tasks, or the build fails.

const HONCHO_BASE_URL = 'https://api.honcho.dev'
const INDEX_SESSION_ID = 'skills-index'
const INDEX_PEER_ID = 'skill-index'
const EXAMPLES_PER_SKILL = 8

// `path` is the library-relative body path stored in Honcho; `file` is where
// this machine reads the same body while building.
const SKILLS_ROOT = `${import.meta.dir}/../skills`

export interface Skill {
	name: string
	description: string
	path: string
	file: string
}

interface IndexRecord {
	content: string
	peer_id: string
	metadata: Record<string, unknown>
}

function apiKey(): string {
	const key = process.env.AMPCODE_HONCHO_API_KEY?.trim()
	if (!key) {
		throw new Error('AMPCODE_HONCHO_API_KEY is not set')
	}
	return key
}

function workspaceId(): string {
	const id = process.env.AMPCODE_HONCHO_WORKSPACE_ID?.trim()
	if (!id) {
		throw new Error('AMPCODE_HONCHO_WORKSPACE_ID is not set')
	}
	return id
}

async function honcho(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`${HONCHO_BASE_URL}/v3/workspaces/${workspaceId()}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey()}`,
			'Content-Type': 'application/json',
			...(init?.headers ?? {}),
		},
	})
}

// Enough YAML for the two frontmatter fields a skill is required to have. Handles
// quoted and plain scalars, and the folded/literal block forms.
function frontmatterField(text: string, field: string): string | undefined {
	const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
	if (!block) return undefined
	const lines = block.split(/\r?\n/)
	const start = lines.findIndex((line) => line.startsWith(`${field}:`))
	if (start === -1) return undefined
	const value = lines[start].slice(field.length + 1).trim()
	if (/^[>|][-+]?$/.test(value)) {
		const body: string[] = []
		for (let i = start + 1; i < lines.length && !/^\S/.test(lines[i]); i++) {
			body.push(lines[i].trim())
		}
		return body.join(' ').trim() || undefined
	}
	const quote = value[0]
	if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
		const inner = value.slice(1, -1)
		return (quote === '"' ? inner.replace(/\\(["\\])/g, '$1') : inner.replace(/''/g, "'")).trim() || undefined
	}
	return value.trim() || undefined
}

// One directory per skill, each holding a SKILL.md that names itself. A skill
// missing a name or a description fails the build instead of dropping out, because
// a skill absent from the index is invisible to the agent with nothing to say why.
export async function loadSkills(): Promise<Skill[]> {
	const skills: Skill[] = []
	for (const relative of new Bun.Glob('*/SKILL.md').scanSync({ cwd: SKILLS_ROOT })) {
		const dir = relative.split('/')[0]
		const file = `${SKILLS_ROOT}/${relative}`
		const text = await Bun.file(file).text()
		const name = frontmatterField(text, 'name')
		const description = frontmatterField(text, 'description')
		if (!name) throw new Error(`${relative} has no name in its frontmatter`)
		if (!description) throw new Error(`${relative} has no description in its frontmatter`)
		skills.push({ name, description, path: `skills/${dir}/SKILL.md`, file })
	}
	if (skills.length === 0) {
		throw new Error(`no skills found under ${SKILLS_ROOT}`)
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name))
}

function examplesPath(skill: Skill): string {
	return skill.file.replace(/SKILL\.md$/, 'examples.txt')
}

async function loadExamples(skill: Skill): Promise<string[]> {
	const file = Bun.file(examplesPath(skill))
	if (!(await file.exists())) {
		throw new Error(`${skill.name}: missing examples.txt`)
	}
	const tasks = (await file.text())
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
	if (tasks.length < EXAMPLES_PER_SKILL) {
		throw new Error(`${skill.name}: examples.txt has ${tasks.length} tasks, need at least ${EXAMPLES_PER_SKILL}`)
	}
	return tasks
}

// The plugin shows `metadata.description` rather than the record's own content,
// because an example record's content is a generated task, not the skill summary.
function gitSha(): string {
	const proc = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {
		cwd: `${import.meta.dir}/..`,
		stdout: 'pipe',
		stderr: 'pipe',
	})
	if (proc.exitCode !== 0) {
		throw new Error(`git rev-parse HEAD failed: ${new TextDecoder().decode(proc.stderr)}`)
	}
	return new TextDecoder().decode(proc.stdout).trim()
}

function skillMetadata(skill: Skill, buildId: string, gitSha: string): Record<string, unknown> {
	return {
		build: buildId,
		git_sha: gitSha,
		name: skill.name,
		description: skill.description.trim(),
		path: skill.path,
	}
}

function buildRecords(skills: Skill[], buildId: string, gitSha: string): IndexRecord[] {
	return skills.map((skill) => ({
		content: `SKILL: ${skill.name}\n\n${skill.description.trim()}`,
		peer_id: INDEX_PEER_ID,
		metadata: { kind: 'skill', ...skillMetadata(skill, buildId, gitSha) },
	}))
}

// Example records are required for the abstract `principle-*` skills, because a
// description-only index misses them. Other skills may ship `examples.txt` when
// their description still will not match the way a caller describes the work
// (browser automation is the current case); a missing file is skipped, a short
// one fails the build the same way a short principle file does.
export async function buildExampleRecords(skills: Skill[], buildId: string, gitSha: string): Promise<IndexRecord[]> {
	const records: IndexRecord[] = []
	for (const skill of skills) {
		const required = skill.name.startsWith('principle-')
		if (!required && !(await Bun.file(examplesPath(skill)).exists())) continue
		const examples = await loadExamples(skill)
		for (const example of examples) {
			records.push({
				content: example,
				peer_id: INDEX_PEER_ID,
				metadata: { kind: 'skill-example', ...skillMetadata(skill, buildId, gitSha) },
			})
		}
		console.log(`  ${skill.name}: ${examples.length} examples`)
	}
	return records
}

// Both endpoints are get-or-create, so this is safe on a fresh workspace and on
// every rebuild. No metadata is sent: `POST /sessions` replaces metadata
// wholesale, and sending it here would clear the pointer before the new build
// is uploaded.
async function ensureSessionAndPeer(): Promise<void> {
	const session = await honcho('/sessions', {
		method: 'POST',
		body: JSON.stringify({ id: INDEX_SESSION_ID }),
	})
	if (!session.ok) {
		throw new Error(`creating session failed: HTTP ${session.status} ${await session.text()}`)
	}
	const peer = await honcho('/peers', {
		method: 'POST',
		body: JSON.stringify({ id: INDEX_PEER_ID }),
	})
	if (!peer.ok && peer.status !== 409 && peer.status !== 200) {
		throw new Error(`creating peer failed: HTTP ${peer.status} ${await peer.text()}`)
	}
}

async function uploadRecords(records: IndexRecord[]): Promise<void> {
	for (let i = 0; i < records.length; i += 100) {
		const batch = records.slice(i, i + 100)
		const response = await honcho(`/sessions/${INDEX_SESSION_ID}/messages`, {
			method: 'POST',
			body: JSON.stringify({ messages: batch }),
		})
		if (!response.ok) {
			throw new Error(`uploading messages failed: HTTP ${response.status} ${await response.text()}`)
		}
	}
}

// Runs last: until the pointer moves, searches still resolve to the previous
// build, so an interrupted rebuild leaves the index usable.
async function pointAt(buildId: string, gitSha: string, skillCount: number, exampleCount: number): Promise<void> {
	const response = await honcho('/sessions', {
		method: 'POST',
		body: JSON.stringify({
			id: INDEX_SESSION_ID,
			metadata: {
				kind: 'skill-index',
				current_build: buildId,
				git_sha: gitSha,
				built_at: new Date().toISOString(),
				skills: skillCount,
				examples: exampleCount,
			},
		}),
	})
	if (!response.ok) {
		throw new Error(`repointing the index failed: HTTP ${response.status} ${await response.text()}`)
	}
}

if (import.meta.main) {
	const buildId = new Date().toISOString()
	const sha = gitSha()
	const skills = await loadSkills()
	const records = buildRecords(skills, buildId, sha)
	const exampleRecords = await buildExampleRecords(skills, buildId, sha)
	await ensureSessionAndPeer()
	await uploadRecords([...records, ...exampleRecords])
	await pointAt(buildId, sha, skills.length, exampleRecords.length)

	console.log(
		`Indexed ${skills.length} skills and ${exampleRecords.length} example records into ${workspaceId()}/${INDEX_SESSION_ID}`,
	)
	console.log(`  build: ${buildId}`)
	console.log(`  git_sha: ${sha}`)
	console.log(`  library: ${SKILLS_ROOT}`)
}
