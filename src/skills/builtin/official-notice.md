---
id: official-notice
name: 通知生成
version: 1.0.0
author: 文载官方
category: official
tags: [公文, 通知]
match:
  task: generate
variables:
  - name: subject
    label: 事由
    type: text
    required: true
  - name: receiver
    label: 主送机关
    type: text
    default: 各部门
  - name: bodyPoints
    label: 正文要点
    type: textarea
    required: true
---

请根据以下要点，撰写一份符合《党政机关公文格式》的通知。

主送：{{receiver}}
事由：{{subject}}
要点：
{{bodyPoints}}

要求：
- 使用规范公文用语
- 结构：标题 + 主送 + 正文 + 落款
- 只输出正文，不要解释
