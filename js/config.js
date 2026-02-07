// Configuration for easy testing vs production mode
const CONFIG = {
    // Testing mode: can be disabled for stricter enforcement
    TESTING_MODE: false, // CHANGED: Disabled to enforce security

    // Reputation settings
    INITIAL_REPUTATION: 100,
    MIN_POST_STAKE: 10,
    REPUTATION_DECAY_RATE: 0.05, // 5% weekly
    DECAY_INTERVAL_MS: 7 * 24 * 60 * 60 * 1000, // 1 week
    HIGH_REP_THRESHOLD: 500,
    HIGH_REP_PENALTY: 0.2, // 20% extra slash

    // Voting settings
    QUADRATIC_VOTING: true, // Cost = Votes²

    // Consensus settings
    SEALING_TIME_MS: 48 * 60 * 60 * 1000, // 48 hours
    SUPERMAJORITY_THRESHOLD: 0.66, // 66%

    // Security settings - ENABLED BY DEFAULT to prevent sybil attacks
    ENABLE_COOLDOWN: true, // 7-day new account cooldown (prevents new accounts from manipulating trending votes)
    COOLDOWN_DAYS: 7,
    ENABLE_FINGERPRINT: true, // Device binding (one account per device - prevents incognito spam)
    ENABLE_DECAY: true, // Reputation decay (prevents old score manipulation)

    // Rumor settings
    MAX_RUMOR_LENGTH: 280,

    // UI settings
    TOAST_DURATION: 3000, // 3 seconds
};

// Helper to toggle settings
function updateConfig(key, value) {
    CONFIG[key] = value;
    localStorage.setItem('rumorality_config', JSON.stringify(CONFIG));
}

// Load saved config
function loadConfig() {
    const saved = localStorage.getItem('rumorality_config');
    if (saved) {
        Object.assign(CONFIG, JSON.parse(saved));
    }
}

loadConfig();
