# Bad Patterns

This calibration set provides bad examples, explanations, and corrected versions for instruction reviews. The entry point is `../instruction-lint.md`.

## S1 Unclear strength of a branch-changing constraint

**Bad:** `改 AGENTS.md 时应该注意 token 预算`

**Why:** The sentence constrains what to do when editing a document, but “should” does not establish whether the action is required, optional, or a default.

**Correct:** `改 skill 之 description 时须量 token（≤150 o200k_base）；超限须收紧后再合入`

**Do not report S1:** `写注释时与周围文件的注释密度、命名与惯用法一致` provides a local judgment anchor and an observable success state.

## S2 Trigger or scope has no exclusion

**Bad:** `凡编辑 AGENTS.md 即触发审查`

**Why:** This trigger does not exclude typo fixes, formatting changes, or similar edits.

**Correct:** `凡新增/修订 AGENTS.md 等指令文档之规则段即触发；纯 typo、格式修正不触发`

**Do not report S2:** `默认匹配本目录既有错误处理风格` is not a trigger or scope rule.

## S3 Vague term has no anchor

**Bad:** `适当处理异常，尽量保持兼容`

**Why:** “Appropriately” and “as much as possible” provide no observable anchor, so two agents can reach different conclusions.

**Correct (operationalized):** `异常：可重试者记入 retry_log；不可重试者抛出并通知调用方。兼容层仅保留一个版本周期`

**Correct (local anchor, also passes S3):** `错误处理与同模块既有函数一致；无既有模式时再引入新策略并在 PR 说明`

## S4 Incompatible requirements have no ruling

**Bad:** Two equal-priority rules cover the same scope. Rule A requires `修改后运行项目格式器`, while rule B requires `修改后禁止运行任何格式器`, and nothing resolves the conflict.

**Why:** Both requirements cannot be satisfied. Merely ordering them does not resolve the contradiction.

**Correct:** Delete or narrow the conflicting requirements according to confirmed responsibilities and constraints. If the choice remains unclear, identify the exact conflict and ask the user to decide.

**Do not report S4:** Content review and formatting checks may trigger together when their requirements complement each other. Remove duplicate content under S9, and check necessary execution dependencies under S15.

## S5 No escalation path

**Bad:** `遇冲突时妥善处理`

**Why:** “Properly” has no anchor, and the rule does not say whether to ask the user, use a default, or stop.

**Correct:** `按宿主指令优先级和已确认的职责边界解决冲突；仍有影响目标或权限的未决选择时，暂停受影响的动作并提出具体问题，继续不受影响的已授权工作。`

## S6 Trigger or destination has no counterexample

**Bad:** `将中间产物置于 .agents/docs/`

**Why:** The destination rule does not say when material belongs elsewhere.

**Correct:** `将中间产物置于 .agents/docs/（不属：供用户查阅之文档置于 docs/）`

## S7 Object binding fails

**Bad (drifting reference):** `子任务失败后，先检查这个任务的状态再决定是否新建`

**Why:** `这个任务` could mean the current task or the failed subtask, so two agents may choose different objects.

**Correct:** `子任务失败后，先检查该子任务的状态；仅当其已停止才新建`

**Bad (several names in one paragraph):** The paragraph uses `主文档`, `入口`, `AGENTS`, and `那份` for the same file.

**Correct:** Use one name throughout the paragraph, such as `项目 AGENTS.md`, or provide the path.

**Bad (same term, different meanings across files):** “review” means a lifeguard-rule review in AGENTS.md but a PR review in coding-rules.md.

**Correct:** Use “rule-lint” and “PR review” respectively, so each term has one meaning.

**Do not report S7:** In a single-repository instruction, `this repository` can identify only the current repository and is therefore unambiguous.

## S8 Sentence tax

**Bad (general knowledge):** A skill says `使用 git 进行版本控制时，确保提交信息清晰`.

**Why:** This is general knowledge, and ignoring it would not itself be wrong.

**Correct:** Delete it. If the project has a commit-message contract, state an observable requirement such as `subject ≤ 72 字符，body 含 what/why`.

**Bad (repetition within a section):** `超时则停止。若已超时，不要继续。`

**Why:** Removing the second sentence does not change any decision.

**Correct:** Keep one observable requirement. Do not restate the same fact in an adjacent sentence.

## S9 Restating upstream instructions

**Bad:** A skill says `提交前确认分支为 main` when AGENTS.md already contains the rule.

**Correct:** Delete the downstream copy, which would otherwise conflict when the upstream rule changes.

## S10 Hard-coding a fast-changing dependency

**Bad:** `使用 litellm v1.52.3 的 /v1/chat/completions 端点`

**Correct:** `使用 litellm 的 chat completions 接口`—look up the version and path at runtime.

## S11 Replacing judgment with a trigger-word list

**Bad:** `触发词：lint、审查、audit、check、review、规则审查、措辞审查`

**Correct:** `凡审 agent 指令文档之措辞清晰与歧义即触发` states a category principle rather than an enumeration.

## S12 Wrong classification axis

**Bad:** `凡编辑 *.md 文件即触发此 skill`

**Correct:** `凡新增/修订指令文档之规则段即触发` classifies by purpose.

## S13 Unreachable context reference

**Bad:** A structural-review role says `不检查 lifeguard 规则`, but lifeguard is undefined in that role's context.

**Correct:** Delete the sentence because the role's positive rules already define its scope, or replace it with a positive statement available in the current context.

## S14 Exclusion does not close the loop

**Bad:** `不检查代码风格问题` does not say what to do when a style issue is found.

**Correct:** `不检查风格问题；遇风格问题时标记为 [style] 并跳过，不阻塞合入`

## S15 Missing non-reorderable decision sequence

**Bad:** `先备份生产数据，再跑迁移，再切流量` is presented as an unordered slogan even though the three steps cannot be reordered, and it has no failure stop.

**Why:** Success depends on a fixed order; omitting it can corrupt state.

**Correct:** `须按序：备份成功 → 迁移 → 切流量；任一步失败则停止，不进入下一步`

**Do not report S15 (use S18):** Treating the reorderable sequence “lint, then read files, then think” as the only valid path. Specify an outcome contract and leave the process open.

## S16 Verification has no anchor

**Bad:** `确认没有其他引用`

**Correct:** `删除符号前，在实际调用范围内核对符号搜索结果，并运行覆盖受影响调用路径的构建或测试。说明搜索与测试的覆盖边界；动态调用或外部调用尚未核实时，不把零命中或测试通过当作可安全删除的充分证据。`

## S17 Action has no observation loop

**Bad:** `改完后验证`

**Correct:** `改后运行覆盖受影响行为的聚焦测试，修复本次改动引入的失败；再对照纳入用户最新调整后的任务目标核对结果。测试通过只证明其覆盖的行为，目标尚未达成时继续授权内的工作，无法推进则说明具体阻塞。`

## S18 Process locking

**Bad:** `审查代码时检查：重复逻辑、循环依赖、错误处理不一致、命名规范`

**Why:** The checklist is the entire task definition; removing it leaves no success state.

**Correct:** `模块职责单一，无不必要重复，错误处理与命名与同目录一致。可选参考：重复逻辑、循环依赖……——不限于此。`

## S19 Overconstraint: an absolute prohibition without an inherently-wrong reason

**Bad:** `In code: default to writing no comments. Never write multi-paragraph docstrings — one short line max. Don't create planning documents unless the user asks.`

**Why:** These are global absolute prohibitions. They are wrong for some complex code and some user-requested documentation, are not required by safety or a contract, and can be replaced with local judgment.

**Correct:** `Write code that reads like the surrounding code: match its comment density, naming, and idiom. Planning/analysis files only when the user asks or the task's success state requires a durable artifact.`

**Absolute prohibition still required; do not report S19:** `禁止把密钥写入提交、日志或远端 issue` protects security and state, so violating it is inherently wrong.

## Layer 2, check 3: Misleading names

**Bad:** The directory name `agents-md` is interpreted as “every Markdown file written for agents.”

**Correct:** `docs/agents-md/` contains documents that constrain agent workflows, not every document written for agents.
