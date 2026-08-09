---
id: poetry-check
name: 格律说明
version: 1.0.0
author: 文载官方
category: poet
tags: [诗词, 格律]
match:
  task: proofread
variables:
  - name: poemText
    label: 诗词原文
    type: textarea
    default: "{{selectedText}}"
---

请对以下诗词做格律分析：

{{poemText}}

要求：
- 指出体裁（绝句/律诗/词等）
- 分析押韵、平仄、对仗
- 指出可优化之处
- 用简洁条目输出
