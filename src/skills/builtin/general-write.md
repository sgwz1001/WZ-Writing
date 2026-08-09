---
id: general-write
name: 通用写作
version: 1.0.0
author: 文载官方
category: general
tags: [写作, 通用]
match:
  task: generate
variables:
  - name: topic
    label: 主题
    type: textarea
    required: true
  - name: style
    label: 风格
    type: select
    options: [平实, 优美, 犀利, 幽默, 正式]
    default: 平实
  - name: length
    label: 大致字数
    type: number
    default: 500
---

请围绕「{{topic}}」写一段约 {{length}} 字的内容。

风格要求：{{style}}。

只输出正文，不要解释。
