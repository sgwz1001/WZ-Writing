# -*- coding: utf-8 -*-
"""给 wendao-lineage.ts 里的每个身份插入 icon 字段，并追加 IDENTITY_ORDER。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "src" / "data" / "wendao-lineage.ts"

ICONS = {
    "general": "🖋",
    "webnovel": "📖",
    "poet": "🌸",
    "official": "📜",
    "scholar": "🔍",
    "nonfiction": "🎙",
    "editor": "✂",
    "essayist": "🍃",
    "screenwriter": "🎬",
}

text = TARGET.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)
out = []
i = 0
while i < len(lines):
    line = lines[i]
    out.append(line)

    # 找到 id: 'xxx' 行
    stripped = line.strip()
    if stripped.startswith("id: '") and stripped.endswith("',"):
        kid = stripped[5:-2]
        if kid in ICONS:
            # 下一行通常是 name: ...，在它后面插入 icon
            i += 1
            out.append(lines[i])
            indent = "    "
            out.append(f"{indent}icon: '{ICONS[kid]}',\n")
            i += 1
            continue
    i += 1

text = "".join(out)

# 在 getIdentity 前面追加 IDENTITY_ORDER
needle = "export function getIdentity"
order_line = f"export const IDENTITY_ORDER: readonly IdentityId[] = {list(ICONS.keys())} as const\n\n"
text = text.replace(needle, order_line + needle)

TARGET.write_text(text, encoding="utf-8")
print("已更新 identity 图标与顺序")
