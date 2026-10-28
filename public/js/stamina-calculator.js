/**
 * ThreeKingdoms-AgentEngine: Shared Stamina Calculator (public/js/stamina-calculator.js)
 *
 * Implements canonical stamina and fatigue calculation on the client side:
 * - Dynamic max stamina based on WAR and Health
 * - Current available stamina (MaxStamina - Fatigue)
 * - Parity with backend WageLaborService and engine/rules.js
 */

(function (window) {
  function calculateStamina(player) {
    const warAttr = Number(
      player?.war_attr !== undefined
        ? player.war_attr
        : player?.war !== undefined
        ? player.war
        : 50
    );
    const healthVal = Number(
      player?.health !== undefined ? player.health : 100
    );
    const fatigueVal = Number(player?.fatigue || 0);

    const maxStamina =
      100 +
      Math.max(0, Math.round((warAttr - 50) * 1.5)) +
      Math.floor(healthVal / 10);

    const currentStamina = Math.max(0, maxStamina - fatigueVal);
    const staminaPct = Math.min(
      100,
      Math.max(0, Math.round((currentStamina / maxStamina) * 100))
    );
    const fatiguePct = Math.min(
      100,
      Math.max(0, Math.round((fatigueVal / 100) * 100))
    );

    return {
      maxStamina,
      currentStamina,
      fatigue: fatigueVal,
      staminaPct,
      fatiguePct,
      health: healthVal,
      warAttr
    };
  }

  window.calculateStamina = calculateStamina;
})(typeof window !== 'undefined' ? window : globalThis);
