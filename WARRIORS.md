# 🎴 ONCHAIN WARRIORS — 8 张武士战卡完整角色书

> Onchain Warriors TCG · 角色 / 技能 / 触发条件 / 战术定位 · **v1.1**

---

## 📊 一表总览

| # | 卡牌 | 元素 | 稀有度 | ATK | DEF | LUCK | SPD | HP | 技能 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 🏆 **巨鯨将軍** (WHALE SHOGUN) | GOLD | LEGENDARY | **95** | 88 | 72 | 45 | 256 | 鯨吞 |
| 2 | 🔥 **退行浪人** (DEGEN RONIN) | FIRE | RARE | 80 | 32 | **95** | 97 | 144 | 狂斬 |
| 3 | ❄️ **鑽石武士** (DIAMOND SAMURAI) | ICE | EPIC | 72 | **97** | 65 | 38 | **274** | 不動 + 🛡 Aegis Guard |
| 4 | 🌿 **鎖鏈大名** (DEFI DAIMYO) | NATURE | EPIC | 58 | 80 | 70 | 60 | 240 | 鎖鏈封印 |
| 5 | ⚡ **渡り者** (BRIDGE WANDERER) | STORM | RARE | 65 | 58 | 82 | 91 | 196 | 跨鎖突襲 |
| 6 | 👻 **霊の忍者** (GHOST NINJA) | VOID | UNCOMMON | 40 | 62 | 55 | 78 | 204 | 隱身 |
| 7 | 🌑 **黒曜祭司** (OBSIDIAN PRIEST) | SHADOW | EPIC | 82 | 55 | 60 | **99** | 190 | 先制斬 |
| 8 | 🌟 **預言巫女** (PROPHECY MIKO) | COSMIC | LEGENDARY | 55 | 92 | 78 | 50 | 264 | 天啓 |

> *HP 公式：`80 + DEF × 2`*

---

## 🥇 1. 巨鯨将軍 · WHALE SHOGUN

| | |
|---|---|
| **元素 / 稀有度** | 🏆 GOLD · LEGENDARY |
| **战斗数据** | ATK 95 · DEF 88 · LUCK 72 · SPD 45 · HP 256 |
| **角色定位** | 全能型「核心英雄」— 高攻高血，速度稍慢 |
| **特征** | Volume King · Market Mover · Diamond Hands |
| **链上来源** | 钱包总价值 ≥ $100,000（鲸鱼级持仓） |

**🎯 技能：鯨吞 WHALE DEVOUR**
- **触发窗口**：`ROUND_START`
- **效果**：本回合**全队友军 +30 DEF**
- **能量消耗**：2
- **AI 自动触发**：任一友军 HP ≤ 50% 时
- **战术价值**：救人——队友被打残时全队套盾

---

## 🥈 2. 退行浪人 · DEGEN RONIN

| | |
|---|---|
| **元素 / 稀有度** | 🔥 FIRE · RARE |
| **战斗数据** | ATK 80 · DEF 32 · LUCK 95 · SPD 97 · HP 144 |
| **角色定位** | 「玻璃大炮」— 极致输出 + 最薄血 |
| **特征** | Meme Apostle · Chaos Agent · First Mover |
| **链上来源** | Meme 代币占比 ≥ 35%（炒土狗的） |

**🎯 技能：狂斬 BERSERK SLASH 【v1.1】**
- **触发窗口**：`ON_ATTACK`
- **效果**：**下次攻击 ATK ×1.7，不能暴击**，攻击命中后**自身进入 Vulnerable**（受伤 ×1.5）直到下一次行动前
- **能量消耗**：2
- **AI 自动触发**：能量 ≥ 2 且有存活敌人时
- **战术价值**：高伤换易伤——爆发输出但攻击后变成软柿子，可被对方反击

---

## 🥉 3. 鑽石武士 · DIAMOND SAMURAI

| | |
|---|---|
| **元素 / 稀有度** | ❄️ ICE · EPIC |
| **战斗数据** | ATK 72 · DEF 97 · LUCK 65 · SPD 38 · HP **274（全场最高）** |
| **角色定位** | 「钢铁前线」— 防御最高，强制嘲讽 |
| **特征** | Iron Hands · Blue Chip Lord · Patience Master |
| **链上来源** | 代币 ≤ 4 个且总价值 ≥ $5,000（专注蓝筹的钻石手） |

**🛡️ 被动：AEGIS GUARD（钻石守护）**
- **效果**：**在前排存活时，所有敌方普通攻击必须先打 Diamond**
- **唯一克制**：Pierce 技能（Bridge 跨鎖突襲 / MEV 先制斬）可绕过
- **视觉**：battle 中蓝色脉冲发光边框 + 盾牌 🛡 图标

**🎯 技能：不動 IMMOVABLE【REACTIVE 反应式 · v1.1】**
- **触发窗口**：`BEFORE_DAMAGE`（受击瞬间）
- **效果**：**当承受的伤害足以击杀时**，免疫此次伤害并保留 **1 HP**
- **能量消耗**：2
- **战术价值**：免死——配合 Aegis Guard 让 Diamond 真正成为不死前线

---

## 4. 鎖鏈大名 · DEFI DAIMYO

| | |
|---|---|
| **元素 / 稀有度** | 🌿 NATURE · EPIC |
| **战斗数据** | ATK 58 · DEF 80 · LUCK 70 · SPD 60 · HP 240 |
| **角色定位** | 「控制大师」— 均衡 + 控场 |
| **特征** | Yield Architect · Protocol Insider · Liquidity Lord |
| **链上来源** | 代币 ≥ 8 个（DeFi 多协议玩家） |

**🎯 技能：鎖鏈封印 CHAIN SEAL 【v1.1】**
- **触发窗口**：`ROUND_START`
- **效果**：**敌方 SPD 最高的存活单位**跳过下一次行动（不再是随便选前排）
- **能量消耗**：2
- **AI 自动触发**：场上有 ≥ 2 个存活敌人时
- **战术价值**：针对性封锁——专门关速度型刺客（MEV / Bridge / Degen）

---

## 5. 渡り者 · BRIDGE WANDERER

| | |
|---|---|
| **元素 / 稀有度** | ⚡ STORM · RARE |
| **战斗数据** | ATK 65 · DEF 58 · LUCK 82 · SPD 91 · HP 196 |
| **角色定位** | 「绕后突袭」— 高速 + 穿透 |
| **特征** | Multi-Chain Native · Bridge Expert · Arbitrage Hunter |
| **链上来源** | 跨链数 ≥ 4 条（跨链常客） |

**🎯 技能：跨鎖突襲 CROSS-CHAIN STRIKE 【v1.1】**
- **触发窗口**：`ON_ATTACK`
- **效果**：**绕过敌方前排 + Aegis Guard**，直击 **HP 百分比最低**的目标（不是绝对 HP）
- **能量消耗**：2
- **AI 自动触发**：场上有任一敌人 HP < 40% 时
- **战术价值**：补刀/破阵——对面后排残血时直接收掉，无视嘲讽

---

## 6. 霊の忍者 · GHOST NINJA

| | |
|---|---|
| **元素 / 稀有度** | 👻 VOID · UNCOMMON |
| **战斗数据** | ATK 40 · DEF 62 · LUCK 55 · SPD 78 · HP 204 |
| **角色定位** | 「闪避坦克」— 低攻但难打中 |
| **特征** | Silent Accumulator · Stealth Mode · Long Game Player |
| **链上来源** | 默认（小额、低活跃的「沉睡」钱包） |

**🎯 技能：隱身 PHANTOM STEP【REACTIVE 反应式】**
- **触发窗口**：`BEFORE_DAMAGE`（受击瞬间）
- **效果**：**50% 概率闪避**当前攻击（种子决定的可验证 RNG）
- **能量消耗**：2
- **AI 自动触发**：自身 HP < 70% 时
- **战术价值**：续命——比 Diamond 的"必免疫"更便宜但更随机

---

## 7. 黒曜祭司 · OBSIDIAN PRIEST

| | |
|---|---|
| **元素 / 稀有度** | 🌑 SHADOW · EPIC |
| **战斗数据** | ATK 82 · DEF 55 · LUCK 60 · SPD **99（全场最快）** · HP 190 |
| **角色定位** | 「先手刺客」— 抢攻 + 破甲 |
| **特征** | Front-Runner · Sandwich Lord · Block Stalker |
| **链上来源** | 代币 ≥ 15 个（高频交易机器人/抢跑钱包） |

**🎯 技能：先制斬 PREEMPTIVE STRIKE 【v1.1】**
- **触发窗口**：`ON_ATTACK`
- **效果**：**攻击敌方 DEF 最高的单位**（明确选目标），ATK ×1.5，**完全无视 DEF**
- **能量消耗**：2
- **AI 自动触发**：场上有敌人 DEF ≥ 75（坦克）时
- **战术价值**：克制肉盾——专门针对 Shogun / Diamond / Daimyo / Oracle 这种高 DEF 角色

---

## 8. 預言巫女 · PROPHECY MIKO

| | |
|---|---|
| **元素 / 稀有度** | 🌟 COSMIC · LEGENDARY |
| **战斗数据** | ATK 55 · DEF 92 · LUCK 78 · SPD 50 · HP 264 |
| **角色定位** | 「奶妈坦克」— 双高防御 + 治疗 |
| **特征** | Long-Term Believer · Governance Lord · Diamond Visionary |
| **链上来源** | 代币 ≤ 2 个且总价值 ≥ $20,000（极致钻石手长线信徒） |

**🎯 技能：天啓 DIVINE INSIGHT 【v1.1】**
- **触发窗口**：`ROUND_START`
- **效果**：治疗 **HP 百分比最低**的友军（不是绝对 HP），恢复其最大 HP 的 30%
- **能量消耗**：2
- **AI 自动触发**：任一友军 HP ≤ 45% 时
- **战术价值**：续航——把濒死友军救回半血，比 Shogun 的群体 buff 更针对单体

---

## 🌪️ 元素克制关系

```
       🔥 FIRE
      ↗        ↘
   ❄️ ICE      🌿 NATURE
      ↖        ↙
       ⚡ STORM

   🏆 GOLD ⇄ 👻 VOID  （互克）
   🌑 SHADOW ⇄ 🌟 COSMIC  （互克）
```

**伤害修正**：
- ✅ 克制对方：伤害 **×1.5**
- ❌ 被克制：伤害 **×0.7**
- ➖ 中立：伤害 **×1.0**

---

## 🎯 技能机制对比（v1.1）

| 技能名 | 触发窗口 | 类型 | 作用 |
|---|---|---|---|
| **鯨吞 Whale Devour** | ROUND_START | Buff | 全队 +30 DEF（友军 HP≤50% 时） |
| **狂斬 Berserk Slash** | ON_ATTACK | 自增益 + 后果 | ATK ×1.7（无暴击）+ 自身易伤 ×1.5 |
| **不動 Immovable** | BEFORE_DAMAGE / Reactive | 免死 | 致命伤害时保留 1 HP |
| **鎖鏈封印 Chain Seal** | ROUND_START | 控制 | 封印敌方 SPD 最高单位 |
| **跨鎖突襲 Cross-Chain** | ON_ATTACK | 穿透 | 打 HP% 最低敌人（绕前排 + 嘲讽） |
| **隱身 Phantom Step** | BEFORE_DAMAGE / Reactive | 自保 | 50% 闪避（HP<70% 触发） |
| **先制斬 Preemptive** | ON_ATTACK | 穿透 | 打 DEF 最高敌人，无视 DEF |
| **天啓 Divine Insight** | ROUND_START | 治疗 | HP% 最低友军回 30% maxHP |

---

## ⚡ 能量系统

| 项 | 数值 |
|---|---|
| 起始能量 | **1** |
| 每回合获取 | +1（上限 3，**全队同步在回合开始时获取**） |
| 技能消耗 | 2 |
| 每场最多使用 | **每张卡 1 次**（用过就锁） |
| **结论** | **第 1 回合即可放技能**——反应式技能（Immovable / Phantom Step）从开局就能保护被打 |

---

## 🧮 战斗公式

### HP 公式
```
HP = 80 + DEF × 2
```

### 伤害公式
```
damage = ceil( max(5, ATK × elem × crit × vuln − DEF × 0.25) )
```

其中：
- `elem`：元素克制倍率（1.5 / 0.7 / 1.0）
- `crit`：暴击倍率（1.5 / 1.0），**Berserk 期间禁用**
- `vuln`：目标 Vulnerable 时 ×1.5（Degen 狂斬后自身进入此状态）
- 最低保底 **5** 伤害（防互刮痧）

### 暴击规则
```
critChance     = min(LUCK, 30)   // 封顶 30%
critMultiplier = 1.5
// Berserk 期间禁用暴击（避免 SPD+ATK+CRIT+BURST 叠加 1-shot）
```

### 站位攻击优先级
1. **Pierce 技能**（Cross-Chain / Preemptive）→ 直接打自选目标（绕过站位 + 嘲讽）
2. **AEGIS GUARD 嘲讽**（Diamond 在前排存活）→ 必须先打 Diamond
3. **敌方前排存活** → 攻击前排（同列对位优先：FL↔FL / FR↔FR）
4. **敌方前排全死** → 才能打后排

### 行动顺序
1. SPD 高者先动
2. 同 SPD 按位置：FL → FR → BL → BR
3. 仍同则按 ID 字符串排序

---

## 🏁 回合上限与平局判定（v1.1）

**最多 6 回合**。如果 6 回合后仍未分胜负，按确定性 tiebreaker：

1. 存活单位多者胜
2. 相同则 HP% 总和高者胜
3. 再相同则累计伤害高者胜
4. 再相同则队伍 SPD 总和高者胜
5. 仍相同则用 seed hash 决定（确定性，可验证）

---

## 🎲 可验证 RNG

所有战斗内随机（暴击、闪避、平局）都用 **FNV-1a hash** 从公开 seed 派生：

```js
roll = FNV1a-hash(`${seed}|${roundIndex}|${actionIndex}|${source}|${target}|${label}`) % 100
```

**核心保证**：给定 seed + 决斗双方卡组，战斗 100% 可复现。
- AI / PVP 模式自动用服务端推送的 seed
- 战斗结束后 seed 显示在 Victory 屏 + 推特分享文案
- 任何人可拿 seed 验证战斗结果

---

## 🧠 站位 × 职业 推荐布阵

| 位置 | 适合职业 | 原因 |
|---|---|---|
| **FL / FR**（前排扛伤） | 鑽石武士 · 預言巫女 · 巨鯨将軍 · 鎖鏈大名 | DEF ≥ 80，HP > 240 |
| **BL / BR**（后排保护） | 退行浪人 · 渡り者 · 霊の忍者 · 黒曜祭司 | DEF < 65，需要保护 |

> **特殊**：黒曜祭司 SPD 99 全场最快但 DEF 只有 55 → 放后排保命，配合 Pierce 技能可绕过对方前排直接斩首。

---

## 💎 链上钱包 → 卡牌职业 判定逻辑

服务端 `determineClassFromData(tokens, totalValue)` 按优先级匹配：

```
1. Meme 代币占比 ≥ 35%                       → 🔥 DEGEN_RONIN
2. 跨链数 ≥ 4 条                             → ⚡ BRIDGE_WANDERER
3. 代币数 ≥ 15 个                            → 🌑 OBSIDIAN_PRIEST
4. 代币数 ≤ 2 且 总价值 ≥ $20K               → 🌟 PROPHECY_MIKO
5. 代币数 ≤ 4 且 总价值 ≥ $5K                → ❄️ DIAMOND_SAMURAI
6. 总价值 ≥ $100K                            → 🏆 WHALE_SHOGUN
7. 代币数 ≥ 8 个                             → 🌿 DEFI_DAIMYO
8. （默认）                                  → 👻 GHOST_NINJA
```

> 行为标签优先于财富标签——demo 也保留鲸鱼识别。

---

## 🏅 段位双轨

### 荣誉等级（只增不减）
| 胜场 | 称号 |
|---|---|
| 0 | INITIATE |
| 1–19 | BRONZE RONIN |
| 20–99 | SILVER SAMURAI |
| 100–299 | GOLDEN DAIMYO |
| 300–999 | DIAMOND SHOGUN |
| 1000+ | ONCHAIN EMPEROR |

### 竞技分（赢 +25 / 输 −15）
| 分数 | Tier |
|---|---|
| 0–799 | BRONZE |
| 800–999 | SILVER |
| 1000–1199 | GOLD（起始） |
| 1200–1499 | PLATINUM |
| 1500–1999 | DIAMOND |
| 2000–2499 | MASTER |
| 2500+ | GRANDMASTER |

| 模式 | 影响 |
|---|---|
| 🤖 vs AI | ✅ 计分 |
| 📡 LIVE PVP | ✅ 计分 |
| 🎯 CHALLENGE WALLET | ❌ **不计分**（防刷分） |

---

## 🐦 一句话故事（Lore）

| 卡牌 | Tagline |
|---|---|
| 巨鯨将軍 | "A sovereign of the blockchain seas. Few dare oppose your positions." |
| 退行浪人 | "No master, no mercy. The blockchain trembles at your recklessness." |
| 鑽石武士 | "Unwavering resolve forged in bear markets. Patience is your weapon." |
| 鎖鏈大名 | "Your yield compounds in silence while others chase pumps." |
| 渡り者 | "No single chain contains your ambitions. You move value across dimensions." |
| 霊の忍者 | "Invisible to the market. The greatest move is knowing when not to move." |
| 黒曜祭司 | "You see the mempool before it crystallizes. Speed is your only commandment." |
| 預言巫女 | "You read the chain like ancient scripture. Time bows to your conviction." |

---

## 📐 数值平衡参考表

### 普攻 70 ATK 打不同 DEF 目标（无暴击、无元素加成）

| 防守方 | DEF | HP | 单次伤害 | 击杀回合 |
|---|---|---|---|---|
| 退行浪人 | 32 | 144 | 62 | 3 击 |
| 黒曜祭司 | 55 | 190 | 57 | 4 击 |
| 渡り者 | 58 | 196 | 56 | 4 击 |
| 霊の忍者 | 62 | 204 | 55 | 4 击 |
| 鎖鏈大名 | 80 | 240 | 50 | 5 击 |
| 巨鯨将軍 | 88 | 256 | 48 | 6 击 |
| 預言巫女 | 92 | 264 | 47 | 6 击 |
| 鑽石武士 | 97 | 274 | 46 | 6 击 |

> 坦克韧度比 ≈ 2x（不会非线性膨胀）

### 关键技能的数值冲击（Degen ATK 80 vs DEF 88 Shogun，HP 256）

| 场景 | 伤害 | 击杀回合 |
|---|---|---|
| 普攻 | 58 | 5 |
| 普攻 + 暴击（1.5×） | 98 | 3 |
| 普攻 + 元素克制 | 98 | 3 |
| 普攻 + 暴击 + 元素 | 158 | 2 |
| **狂斬 Berserk**（80 × 1.7） | 110 | 3 |
| **狂斬 + 元素**（无暴击） | **180 ⚠️ 最高单次伤害** | **2** |
| **先制斬 Preemptive**（无视 DEF） | 106 | 3 |
| **先制斬 + 暴击 + 元素** | 207 | 2 |

**关键设计点**：
- 没有任何场景能 1-shot 满血 256 HP 坦克
- Berserk 与 Crit 互斥 → 速度型不能 SPD+ATK+CRIT+BURST 全叠
- Berserk 后自身易伤 → 高伤换高风险
- Pierce 技能保留 2-shot 能力 → 反制坦克但需要 2 回合

---

## 📝 v1.1 改动汇总

1. **退行浪人**：ATK 90 → 80
2. **狂斬 Berserk Slash**：
   - 倍率 ×2 → **×1.7**
   - **禁用暴击**
   - 新增：攻击后自身进入 **Vulnerable ×1.5**（直到下次行动前）
3. **鑽石武士**：新增被动 **AEGIS GUARD**（前排强制嘲讽）
4. **不動 Immovable**：从"反应式免疫一击"改为 **"致命伤害时保 1 HP"**
5. **隱身 Phantom Step**：改为**反应式技能**（被攻击时触发，HP<70%）
6. **鎖鏈封印 Chain Seal**：目标改为**敌方 SPD 最高单位**
7. **跨鎖突襲 Cross-Chain Strike**：目标改为 **HP 百分比最低**敌人
8. **先制斬 Preemptive Strike**：目标明确为**敌方 DEF 最高单位**
9. **天啓 Divine Insight**：目标改为 **HP 百分比最低**友军
10. **能量系统**：起始 0 → **1**（全队同步回合开始 +1）
11. **暴击系统**：LUCK% → **min(LUCK, 30)** 封顶 30%，倍率 ×2 → ×1.5
12. **回合上限**：无限 → **6 回合**
13. **平局判定**：新增 5 层 tiebreaker（survivors → HP% → damage → SPD → seed）
14. **战斗 RNG**：Math.random() → **seeded FNV-1a hash**（可验证战斗复现）
15. **双轨段位**：分拆为**荣誉**（胜场，只增）+ **竞技分**（赢+25/输-15，钱包挑战不计分）

---

*Last updated: v1.1 — 元素环 6 + 互克 2 元素 / 8 种职业 / 6 主动 + 2 反应式 + 1 被动 / 2×2 阵型 + Aegis Guard 嘲讽 / 可验证 RNG / Berserk × Crit 互斥 / Vulnerable 状态 / 6 回合上限 + Tiebreaker*
