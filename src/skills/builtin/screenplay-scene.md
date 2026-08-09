---
id: screenplay-scene
name: 场景生成
version: 1.0.0
author: 文载官方
category: screenwriter
tags: [剧本, 场景]
match:
  task: scene
variables:
  - name: setting
    label: 场景地点
    type: text
    required: true
  - name: characters
    label: 出场人物
    type: text
    required: true
  - name: mood
    label: 情绪基调
    type: select
    options: [紧张, 浪漫, 悬疑, 悲壮, 轻松]
    default: 紧张
---

请生成一个剧本场景。

地点：{{setting}}
人物：{{characters}}
基调：{{mood}}

要求：
- 使用标准剧本格式：场景标题 + 动作描述 + 对白
- 突出人物冲突
- 只输出场景正文，不要解释
