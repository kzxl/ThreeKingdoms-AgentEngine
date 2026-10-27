# ThreeKingdoms-Simulation MCP Integration Instructions

This MCP server (`threekingdoms-sim`) connects autonomous AI Agents (such as Google Antigravity, Claude Desktop, and AgentOption frameworks) directly to the authoritative Grand Strategy simulation engine.

---

## 1. Core Operating Principles

1. **Zero State Drift**: All facts, financial balances, and item quantities MUST come directly from `sim_query_player` or `sim_audit_invariants`. Never fabricate or hallucinate inventory or cash.
2. **Deterministic Hard Math**:
   - Use `sim_calculate_price` to look up supply/demand commodity market fluctuations.
   - Use `sim_check_supply_line` to verify BFS logistical connectivity before ordering troop maneuvers or sending trade caravans.
   - Use `sim_get_kizuna` to evaluate 2-axis social relations (Affinity & Respect) and active Hooks/Debts.
3. **Continuous Learning (Episodic Reflection)**:
   - After any meaningful dialogue, duel, or business interaction with an NPC, call `sim_record_memory` to persist the experience. The NPC will remember this in future interactions.

---

## 2. Available Tool Catalog

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `sim_query_player` | `{ playerId?: string }` | Query character attributes, liquid cash, safe cash, grain, location, and inventory. |
| `sim_check_supply_line` | `{ fromNode: string, supplyHub: string, maxHops?: number }` | BFS graph pathfinding to check logistical supply-line reachability. |
| `sim_calculate_price` | `{ commodity: string, basePrice: number, stockUnits: number, demandUnits: number }` | Compute dynamic market price elasticity. |
| `sim_get_kizuna` | `{ charA: string, charB: string }` | Check Affinity (-100..+100), Respect (0..100), Sworn brotherhood, and Hooks. |
| `sim_record_memory` | `{ npcId: string, topic: string, lessonLearned: string, emotionalValence?: string }` | Harvest episodic memory for NPC self-learning and psychological evolution. |
| `sim_audit_invariants` | `{}` | Execute independent 80/80 invariant verification on SQLite. |
