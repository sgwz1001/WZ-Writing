import { CONTRACT_RISK_RULES, type ContractRiskRule, type ContractTemplate, renderContractSkeleton } from '../data/contractTemplates'

export interface RiskMatch {
  ruleId: string
  name: string
  severity: 'error' | 'warn' | 'info'
  suggestion: string
  snippet: string
  line: number
}

/**
 * 扫描纯文本合同内容，返回命中的本地风险规则。
 */
export function checkContractRisks(text: string): RiskMatch[] {
  const lines = text.split(/\r?\n/)
  const matches: RiskMatch[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const rule of CONTRACT_RISK_RULES) {
      if (!rule.pattern.test(line)) continue
      // 同一规则在同一行只报一次
      const key = `${rule.id}:${i}`
      if (seen.has(key)) continue
      seen.add(key)
      matches.push({
        ruleId: rule.id,
        name: rule.name,
        severity: rule.severity,
        suggestion: rule.suggestion,
        snippet: line.slice(0, 80),
        line: i + 1,
      })
    }
  }

  return matches.sort((a, b) => {
    const order = { error: 0, warn: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
}

export function getRiskStats(matches: RiskMatch[]) {
  return {
    error: matches.filter((m) => m.severity === 'error').length,
    warn: matches.filter((m) => m.severity === 'warn').length,
    info: matches.filter((m) => m.severity === 'info').length,
  }
}

export { renderContractSkeleton, type ContractTemplate, type ContractRiskRule }
