/**
 * ThreeKingdoms-AgentEngine: Global Config & Application State (public/js/config.js)
 * Standards Applied: AgentOption UI System & Anti-AI-Slop Architecture
 */

const API_BASE = '';

// Global Application State
let activeSubLocation = 'Vườn Đào';
let lastEncounterSubLocation = null;
let currentScene = null;
let currentInventory = [];
let currentStatus = null;
let selectedChoiceId = null;
let isProcessingAction = false; // Anti-Piling Guard
const storyChronicle = []; // History of dialogue and action turns
let currentLang = localStorage.getItem('sim_lang') || 'vi';

// Expose state to window for module interoperability
window.API_BASE = API_BASE;
window.storyChronicle = storyChronicle;
