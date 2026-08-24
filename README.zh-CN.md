# N0 Verify——AI 编写代码的独立验证工具

[English](README.md) | **简体中文**

> AI 说“完成了”，N0 Verify 负责检查证据。

N0 Verify 是一个面向 AI/Agent 编写代码的本地优先、开源验证系统。它不采信 Agent 自己给出的完成总结，而是独立检查 Git 仓库、可信 Base 策略、测试完整性、Base/Head 行为和负向证据。

```bash
npx n0-verify demo
```

无需账号、API Key，也不会默认上传源代码。

详细操作步骤见[中文使用说明](docs/使用说明.md)。

## 可以检查什么

- 删除、跳过、todo 或 focused 测试
- 删除或高置信度削弱断言
- 使用 `|| true`、`exit 0` 等方式隐藏测试失败
- 降低覆盖率阈值或缩小测试发现范围
- Base 健康状态与候选提交健康状态
- `C0T0 / C1T0 / C0T1 / C1T1` 四象限测试矩阵
- 新测试在旧实现上是否仍然通过
- 强制需求及其证据类型是否满足
- 安全敏感目录和 CI 配置变化
- 可复现、可验证哈希的 Proof Pack

N0 Verify 将“证据是否支持”与“策略是否允许合并”分开表达：

| 证据状态 | 含义 |
| --- | --- |
| `SUPPORTED` | 所需证据支持当前范围内的声明 |
| `CONTRADICTED` | 可复现证据与声明冲突 |
| `INCONCLUSIVE` | 现有证据不足，无法得出结论 |

| 策略判定 | 含义 |
| --- | --- |
| `PASS` | 可信策略允许该修改 |
| `WARN` | 存在需要审查的非阻断发现 |
| `BLOCK` | 阻断级策略义务失败 |

## 快速开始

```bash
npm install
npm run build
node dist/cli-entry.js init
node dist/cli-entry.js check --base HEAD~1
```

`check` 默认使用 `.n0/n0.config.yml` 中的执行模式。新配置默认使用 Audit 模式，不执行仓库代码。

```bash
# 干净 worktree，但它不是安全沙箱
n0-verify check --base origin/main --mode worktree

# Docker 隔离，默认关闭网络
n0-verify check --base origin/main --mode container

# 显式覆盖测试命令，仅执行模式有效
n0-verify check --base origin/main --mode worktree --test-command "node --test"
```

## CLI 命令

```text
n0-verify init [--language NAME] [--ci github] [--force]
n0-verify check [--base REF] [--head REF] [--mode audit|worktree|container]
n0-verify demo [--json]
n0-verify doctor [--json]
n0-verify explain RULE-ID
n0-verify report [--run ID] [--format html|json|sarif]
n0-verify baseline create|inspect|update
n0-verify proof keygen
n0-verify proof verify DIRECTORY
n0-verify bench [--json]
n0-verify serve
```

## 可信策略

对于 Pull Request，N0 Verify 从 Base 提交读取 `.n0/n0.config.yml`、需求和豁免。候选提交不能降低管理自身验证运行的策略。组织策略可以通过 `N0_ORG_POLICY` 增加不可放宽的约束。

```yaml
version: 1
execution:
  mode: container
  network: false
  timeout_seconds: 120
commands:
  install: npm ci --ignore-scripts
  build: npm run build
  typecheck: npm run check
  test: npm test
policies:
  block_on:
    - test_skip_added
    - focused_test_added
    - test_failure_masked
    - non_discriminating_test
matrix:
  enabled: true
negative_control:
  enabled: true
  max_mutants: 10
report:
  html: true
  json: true
  sarif: true
```

## Proof Pack

完整检查可在 `.n0/runs/<run-id>/` 中生成：

- 规范化的 `proof.json` 和 `manifest.json`
- 命令证据及 stdout/stderr 哈希
- Findings、变更文件、需求结果和四象限证据
- 独立、响应式 `report.html` 和状态徽章
- SARIF 输出
- 可选 Ed25519 签名

```bash
n0-verify proof keygen
n0-verify check --signing-key .n0/signing-key.pem
n0-verify proof verify .n0/runs/<run-id>
```

## GitHub Action

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@<固定的完整提交 SHA>
    with:
      fetch-depth: 0
  - uses: HmZ9874/n0-verify@<固定的完整提交 SHA>
    with:
      base: ${{ github.event.pull_request.base.sha }}
      head: ${{ github.event.pull_request.head.sha }}
      mode: worktree
```

打包后的 Action 无需安装本仓库依赖即可运行。Fork PR 默认降级到 Audit 模式。不要使用 `pull_request_target` 执行不可信 PR 代码，具体威胁模型见 [SECURITY.md](SECURITY.md)。

## 语言与扩展能力

内置项目检测和确定性命令覆盖 JavaScript/TypeScript、Python、Go 和 Rust。JavaScript 与 Python 具有四象限矩阵和 Changed-line Mutation 集成测试；Go 与 Rust 提供项目检测、测试库存和执行适配器。

扩展接口：

- `n0-verify/adapter-sdk`
- `n0-verify/plugin-sdk`
- `n0-verify/remote-runner`
- `n0-verify/dashboard`

架构、Schema、组织策略、集成方式和 Remote Runner 协议位于 [docs](docs/) 目录。

## 项目开发

```bash
npm run lint
npm run check
npm test
npm run bench
npm pack --dry-run
```

N0 Verify 检查的是：当前范围内的完成声明是否具有充分、可信、可复现的证据。它不承诺数学意义上的完整程序正确性。

## 许可证

[Apache License 2.0](LICENSE)
