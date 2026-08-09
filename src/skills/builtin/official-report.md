---
id: official-report
name: 报告生成
version: 1.0.0
author: 文载官方
category: official
tags: [公文, 报告]
match:
  task: generate
variables:
  - name: subject
    label: 事由
    type: text
    required: true
  - name: sections
    label: 报告要点
    type: textarea
    required: true
---

请撰写一份 {{subject}} 报告。

报告要点：
{{sections}}

要求：
- 使用规范公文用语
- 结构：标题 + 主送 + 正文（背景、情况、建议） + 落款
- 只输出正文，不要解释
