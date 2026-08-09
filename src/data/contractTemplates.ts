/**
 * 合同模板库与风险规则
 *
 * 8 类常见合同骨架 + 本地风险识别规则。
 */

export interface ContractTemplate {
  id: string
  name: string
  description: string
  parties: 2 | 3
  clauses: string[]
  skeleton: string
  riskKeywords: string[]
}

export interface ContractRiskRule {
  id: string
  name: string
  pattern: RegExp
  severity: 'error' | 'warn' | 'info'
  suggestion: string
}

export interface ContractDraftInput {
  type: string
  partyA: string
  partyB: string
  projectName: string
  amount?: string
  duration?: string
  keyTerms: string
}

const partyBlock = (a: string, b: string) =>
  `<p>甲方：${a}</p>\n<p>乙方：${b}</p>\n<p>鉴于：</p>`

const signBlock = `<p style="text-align:right">甲方（签章）：</p>
<p style="text-align:right">乙方（签章）：</p>
<p style="text-align:right">日期：{{日期}}</p>`

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'commission',
    name: '委托合同',
    description: '一方委托另一方处理事务',
    parties: 2,
    clauses: ['委托事项', '权限与期限', '报酬及支付方式', '报告义务', '保密', '违约责任'],
    skeleton: `${partyBlock('{{甲方}}', '{{乙方}}')}
<p>一、委托事项：{{事项}}</p>
<p>二、受托人权限：{{权限}}</p>
<p>三、委托期限：{{期限}}</p>
<p>四、报酬及支付方式：{{报酬}}</p>
<p>五、报告义务：{{报告}}</p>
<p>六、保密条款：{{保密}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['权限不明', '报酬待定', '无终止条件'],
  },
  {
    id: 'tech-cooperation',
    name: '技术合作合同',
    description: '共同研发、技术转让或联合开发',
    parties: 2,
    clauses: ['合作内容', '知识产权归属', '经费分担', '成果验收', '保密', '竞业限制'],
    skeleton: `${partyBlock('{{甲方}}', '{{乙方}}')}
<p>一、合作内容：{{内容}}</p>
<p>二、双方权利义务：{{权利义务}}</p>
<p>三、知识产权归属：{{知识产权}}</p>
<p>四、经费与支付方式：{{经费}}</p>
<p>五、成果验收标准：{{验收}}</p>
<p>六、保密与竞业限制：{{保密}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['知识产权不清', '验收标准模糊', '经费待定'],
  },
  {
    id: 'joint-venture',
    name: '合资合同',
    description: '共同出资设立项目或公司',
    parties: 2,
    clauses: ['出资方式与比例', '盈亏分担', '治理结构', '退出机制', '竞业禁止', '解散清算'],
    skeleton: `${partyBlock('{{甲方}}', '{{乙方}}')}
<p>一、合作项目：{{项目}}</p>
<p>二、出资方式与比例：{{出资}}</p>
<p>三、盈亏分担：{{盈亏}}</p>
<p>四、治理结构与决策机制：{{治理}}</p>
<p>五、退出机制：{{退出}}</p>
<p>六、竞业禁止：{{竞业}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['退出机制缺失', '盈亏比例不明', '竞业范围过宽'],
  },
  {
    id: 'sale',
    name: '买卖合同',
    description: '标的物所有权转移',
    parties: 2,
    clauses: ['标的物', '价款', '交付方式', '质量标准', '风险转移', '验收与质保'],
    skeleton: `${partyBlock('{{甲方（卖方）}}', '{{乙方（买方）}}')}
<p>一、标的物：{{标的物}}</p>
<p>二、价款及支付方式：{{价款}}</p>
<p>三、交付时间、地点与方式：{{交付}}</p>
<p>四、质量标准：{{质量}}</p>
<p>五、验收与质保：{{验收}}</p>
<p>六、风险转移：{{风险}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['质量标准缺失', '交付时间不明', '价款待定'],
  },
  {
    id: 'service',
    name: '服务合同',
    description: '一方提供服务、另一方支付费用',
    parties: 2,
    clauses: ['服务内容', '服务期限', '服务费用', '验收标准', '知识产权', '保密'],
    skeleton: `${partyBlock('{{甲方（委托方）}}', '{{乙方（服务方）}}')}
<p>一、服务内容：{{内容}}</p>
<p>二、服务期限：{{期限}}</p>
<p>三、服务费用及支付方式：{{费用}}</p>
<p>四、验收标准：{{验收}}</p>
<p>五、知识产权归属：{{知识产权}}</p>
<p>六、保密条款：{{保密}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['服务内容模糊', '验收标准缺失', '费用待定'],
  },
  {
    id: 'lease',
    name: '租赁合同',
    description: '租赁物使用权让渡',
    parties: 2,
    clauses: ['租赁物', '租赁期限', '租金及支付', '维修义务', '转租限制', '返还条件'],
    skeleton: `${partyBlock('{{甲方（出租方）}}', '{{乙方（承租方）}}')}
<p>一、租赁物：{{租赁物}}</p>
<p>二、租赁期限：{{期限}}</p>
<p>三、租金及支付方式：{{租金}}</p>
<p>四、维修义务：{{维修}}</p>
<p>五、转租与使用限制：{{限制}}</p>
<p>六、返还条件：{{返还}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['维修义务不明', '转租未约定', '返还条件缺失'],
  },
  {
    id: 'loan',
    name: '借款合同',
    description: '借贷资金',
    parties: 2,
    clauses: ['借款金额', '借款期限', '利率', '还款方式', '担保', '提前还款'],
    skeleton: `${partyBlock('{{甲方（出借方）}}', '{{乙方（借款方）}}')}
<p>一、借款金额：{{金额}}</p>
<p>二、借款期限：{{期限}}</p>
<p>三、利率及利息支付：{{利率}}</p>
<p>四、还款方式：{{还款}}</p>
<p>五、担保条款：{{担保}}</p>
<p>六、提前还款：{{提前还款}}</p>
<p>七、违约责任：{{违约}}</p>
<p>八、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['利率不明', '还款方式缺失', '无担保'],
  },
  {
    id: 'construction',
    name: '建设工程合同',
    description: '工程项目的勘察、设计、施工',
    parties: 2,
    clauses: ['工程概况', '工期', '质量标准', '合同价款', '变更与签证', '验收与结算', '安全责任'],
    skeleton: `${partyBlock('{{甲方（发包方）}}', '{{乙方（承包方）}}')}
<p>一、工程概况：{{工程}}</p>
<p>二、工期：{{工期}}</p>
<p>三、质量标准：{{质量}}</p>
<p>四、合同价款及支付：{{价款}}</p>
<p>五、变更与签证：{{变更}}</p>
<p>六、验收与结算：{{验收}}</p>
<p>七、安全责任：{{安全}}</p>
<p>八、违约责任：{{违约}}</p>
<p>九、争议解决：{{争议}}</p>
${signBlock}`,
    riskKeywords: ['工期不明', '质量标准缺失', '价款待定', '变更机制不清'],
  },
]

export const CONTRACT_RISK_RULES: ContractRiskRule[] = [
  {
    id: 'vague-payment',
    name: '付款条款模糊',
    pattern: /(?:付款|支付|价款|报酬|费用).*?(?:待定|另行协商|视情况而定|以实际为准|按实结算)/,
    severity: 'warn',
    suggestion: '建议明确金额、支付时间、支付方式和发票要求。',
  },
  {
    id: 'no-termination',
    name: '缺少终止/解除条款',
    pattern: /(?!.*(?:解除|终止|期满))(?:有效期|合作期限|租赁期限|服务期限|委托期限)/,
    severity: 'warn',
    suggestion: '建议增加合同解除/终止条件与提前通知期限。',
  },
  {
    id: 'no-dispute',
    name: '缺少争议解决条款',
    pattern: /(?!.*(?:仲裁|诉讼|协商|调解)).*争议/,
    severity: 'error',
    suggestion: '必须约定争议解决方式（仲裁或诉讼）及管辖地。',
  },
  {
    id: 'no-ip',
    name: '知识产权归属不明',
    pattern: /(?:成果|作品|技术|知识产权).*?(?:共享|共同所有|按贡献分配|另行约定)/,
    severity: 'warn',
    suggestion: '建议明确知识产权归属、使用权与转让条件。',
  },
  {
    id: 'vague-scope',
    name: '服务/事项范围模糊',
    pattern: /(?:服务|事项|工作|内容).*?(?:等|及其他|相关|相应)/,
    severity: 'info',
    suggestion: '建议用列举方式明确范围，避免「等」字扩大解释。',
  },
  {
    id: 'no-breach',
    name: '违约责任缺失',
    pattern: /(?!.*(?:违约金|赔偿|责任|滞纳金)).*违约/,
    severity: 'error',
    suggestion: '建议明确违约情形、违约金比例与损失赔偿范围。',
  },
]

export function getContractTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)
}

export function getContractTemplateByName(name: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.name === name)
}

export function renderContractSkeleton(template: ContractTemplate, vars: Record<string, string>): string {
  let html = template.skeleton
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return html
}
