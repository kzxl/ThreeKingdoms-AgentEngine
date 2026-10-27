/**
 * ThreeKingdoms-AgentEngine: Seeded PRNG & Deterministic Dice Service (engine/random.js)
 * Implements Mulberry32 PRNG for reproducible simulation runs.
 */

class SeededRandom {
  constructor(seed = 1840201) {
    this.seed = seed >>> 0;
  }

  // Returns pseudo-random float [0, 1)
  nextFloat() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns integer in range [min, max] inclusive
  nextInt(min, max) {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  // Rolls standard 20-sided die [1, 20]
  d20() {
    return this.nextInt(1, 20);
  }

  // Rolls standard 100-sided die [1, 100]
  d100() {
    return this.nextInt(1, 100);
  }
}

module.exports = {
  SeededRandom
};
