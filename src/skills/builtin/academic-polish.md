---
id: academic-polish
name: 学术润色
version: 1.0.0
author: 文载官方
category: scholar
tags: [学术, 润色]
match:
  task: polish
variables:
  - name: paragraph
    label: 待润色段落
    type: textarea
    default: "{{selectedText}}"
  - name: style
    label: 风格
    type: select
    options: [更严谨, 更流畅, 更简洁, 更符合期刊要求]
    default: 更严谨
---

请对以下学术段落进行润色，目标：{{style}}。

原文：
{{paragraph}}

要求：
- 保留原意与专业术语
- 提升表达清晰度
- 只输出润色后的段落，不要解释
