---
id: planner-contract
name: 合同生成
version: 1.0.0
author: 文载官方
category: planner
tags: [合同, 策划]
match:
  task: contract
variables:
  - name: partyA
    label: 甲方
    type: text
    required: true
  - name: partyB
    label: 乙方
    type: text
    required: true
  - name: type
    label: 合同类型
    type: select
    options: [服务合同, 委托创作, 保密协议, 合作协议, 买卖合同]
    default: 服务合同
  - name: terms
    label: 关键条款
    type: textarea
    required: true
---

请起草一份 {{type}}。

甲方：{{partyA}}
乙方：{{partyB}}
关键条款：
{{terms}}

要求：
- 结构完整：标题、双方信息、鉴于条款、权利义务、违约责任、争议解决、签署
- 语言严谨、条款清晰
- 只输出合同正文，不要解释
