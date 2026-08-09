---
id: novel-outline
name: 小说大纲
version: 1.0.0
author: 文载官方
category: webnovel
tags: [大纲, 网文]
match:
  task: outline
variables:
  - name: style
    label: 风格
    type: select
    options: [爽文, 悬疑, 言情, 科幻, 玄幻, 都市, 历史]
    default: 爽文
  - name: volumeCount
    label: 卷数
    type: number
    default: 3
  - name: chapterCount
    label: 每卷章数
    type: number
    default: 30
  - name: premise
    label: 核心梗概
    type: textarea
    required: true
---

请为一部 {{style}} 小说生成大纲。

核心梗概：
{{premise}}

结构要求：
- 共 {{volumeCount}} 卷，每卷约 {{chapterCount}} 章
- 每卷给出：卷名、核心冲突、关键事件、情感转折
- 列出主要人物及其动机
- 只输出大纲，不要解释
