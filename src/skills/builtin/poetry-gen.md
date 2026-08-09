---
id: poetry-gen
name: 诗词生成
version: 1.0.0
author: 文载官方
category: poet
tags: [诗词, 生成]
match:
  task: generate
variables:
  - name: form
    label: 体裁
    type: select
    options: [五言绝句, 七言绝句, 五言律诗, 七言律诗, 词牌, 现代诗]
    default: 七言绝句
  - name: tone
    label: 基调
    type: select
    options: [豪放, 婉约, 清幽, 悲壮, 闲适]
    default: 清幽
  - name: topic
    label: 主题
    type: text
    required: true
---

请创作一首 {{form}}，主题为「{{topic}}」，基调 {{tone}}。

要求：
- 符合 {{form}} 基本格律（平仄、押韵尽量工整）
- 意境统一，用词典雅
- 只输出诗词正文与标题，不要解释
