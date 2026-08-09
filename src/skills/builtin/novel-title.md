---
id: novel-title
name: 小说标题
version: 1.0.0
author: 文载官方
category: webnovel
tags: [标题, 网文]
match:
  task: title
variables:
  - name: style
    label: 风格
    type: select
    options: [中国网文, 日式轻小说, 欧美传统文学, 古典章回体]
    default: 中国网文
  - name: content
    label: 内容概要
    type: textarea
    default: "{{fullText}}"
---

请根据以下内容，生成 4 个 {{style}} 风格的书名：

{{content}}

要求：
- 书名要有记忆点
- 列出主书名 + 一句话卖点
- 只输出书名列表，不要解释
