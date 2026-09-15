#!/usr/bin/env bun
// Author step: write `examples.txt` next to each `principle-*` skill.
//
// The indexer reads those files. It does not call a model. Re-run this after
// a principle skill's body changes enough that the checked-in tasks no longer
// look like the work the rule applies to.
//
//   LITELLM_API_URL=... LITELLM_API_KEY=... bun scripts/generate-skill-examples.ts
//   bun scripts/generate-skill-examples.ts --force   # overwrite existing files
//
// Skips a skill that already has at least 8 tasks, unless `--force` is set.

import { loadSkills, type Skill } from './index-skills.ts'

const EXAMPLE_MODEL = 'deepseek/deepseek-v4-flash'
const EXAMPLES_PER_SKILL = 8

function examplesPath(skill: Skill): string {
	return skill.file.replace(/SKILL\.md$/, 'examples.txt')
}

async function existingTasks(skill: Skill): Promise<string[]> {
	const file = Bun.file(examplesPath(skill))
	if (!(await file.exists())) return []
	return (await file.text())
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

function examplePrompt(skill: Skill, body: string): string {
	return `You are building a retrieval index for a coding agent's skill library.

A skill named "${skill.name}" encodes this rule:

DESCRIPTION: ${skill.description}

BODY:
${body.slice(0, 4000)}

Write ${EXAMPLES_PER_SKILL} concrete software-engineering TASKS to which this rule applies. Each task must:
- read like something a developer or agent would actually ask for, in one sentence, first person
- name real artefacts (files, functions, APIs, config, UI, tests) so it looks like a specific request
- describe a situation where the rule MATTERS, including the specific detail that makes it matter
  (e.g. only one caller, an empty state, a retry path, an external boundary, a repeated instruction)
- NEVER name or paraphrase the rule itself, and never use its vocabulary as the point
- cover ${EXAMPLES_PER_SKILL} different domains (web, CLI, data, infra, mobile, library, test tooling, docs)

Return JSON: {"tasks": ["...", ...]}`
}

async function generateExamples(skill: Skill, body: string): Promise<string[]> {
	const url = (process.env.LITELLM_API_URL ?? '').replace(/\/$/, '')
	const key = process.env.LITELLM_API_KEY?.trim()
	if (!url || !key) {
		throw new Error('LITELLM_API_URL / LITELLM_API_KEY is not set')
	}
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const response = await fetch(`${url}/chat/completions`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: EXAMPLE_MODEL,
					temperature: 0.8,
					response_format: { type: 'json_object' },
					messages: [{ role: 'user', content: examplePrompt(skill, body) }],
				}),
			})
			if (!response.ok) {
				throw new Error(`HTTP ${response.status} ${await response.text()}`)
			}
			const payload = (await response.json()) as { choices: { message: { content: string } }[] }
			const parsed = JSON.parse(payload.choices[0].message.content) as { tasks?: string[] }
			const tasks = (parsed.tasks ?? []).map((task) => task.trim()).filter(Boolean)
			if (tasks.length < EXAMPLES_PER_SKILL) {
				throw new Error(`expected ${EXAMPLES_PER_SKILL} examples, got ${tasks.length}`)
			}
			return tasks.slice(0, EXAMPLES_PER_SKILL)
		} catch (error) {
			if (attempt === 3) {
				throw new Error(`${skill.name}: ${error instanceof Error ? error.message : String(error)}`)
			}
			await Bun.sleep(1500)
		}
	}
	throw new Error('unreachable')
}

if (import.meta.main) {
	const force = Bun.argv.includes('--force')
	const skills = (await loadSkills()).filter((skill) => skill.name.startsWith('principle-'))
	if (skills.length === 0) {
		throw new Error('no principle-* skills found')
	}
	let wrote = 0
	let skipped = 0
	for (const skill of skills) {
		const have = await existingTasks(skill)
		if (!force && have.length >= EXAMPLES_PER_SKILL) {
			console.log(`  skip ${skill.name} (${have.length} tasks)`)
			skipped++
			continue
		}
		const body = await Bun.file(skill.file).text()
		const tasks = await generateExamples(skill, body)
		await Bun.write(examplesPath(skill), `${tasks.join('\n')}\n`)
		console.log(`  wrote ${skill.name}: ${tasks.length} examples`)
		wrote++
	}
	console.log(`wrote ${wrote}, skipped ${skipped}, of ${skills.length} principle skills`)
}
