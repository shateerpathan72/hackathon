// Reputation token management with quadratic voting and decay
class ReputationManager {
    constructor() {
        this.balance = 0;
        this.history = [];
        this.lastDecay = Date.now();
    }

    async init() {
        // Load existing reputation or create new
        let repData = await storage.get('reputation', 'user');

        if (!repData) {
            repData = {
                id: 'user',
                balance: CONFIG.INITIAL_REPUTATION,
                history: [],
                lastDecay: Date.now()
            };
            await storage.put('reputation', repData);
        }

        this.balance = repData.balance;
        this.history = repData.history || [];
        this.lastDecay = repData.lastDecay || Date.now();

        // Apply decay if enabled
        if (CONFIG.ENABLE_DECAY) {
            await this.applyDecay();
        }

        return this.balance;
    }

    async getBalance() {
        return this.balance;
    }

    async addReputation(amount, reason) {
        this.balance += amount;
        this.history.push({
            amount,
            reason,
            timestamp: Date.now(),
            type: 'gain'
        });
        await this.save();
        return this.balance;
    }

    async subtractReputation(amount, reason) {
        this.balance -= amount;
        this.history.push({
            amount,
            reason,
            timestamp: Date.now(),
            type: 'loss'
        });
        await this.save();
        return this.balance;
    }

    canAfford(amount) {
        return this.balance >= amount;
    }

    calculateVoteCost(numVotes) {
        if (CONFIG.QUADRATIC_VOTING) {
            return numVotes * numVotes; // C = V²
        }
        return numVotes; // Linear (for comparison)
    }

    async stake(amount, rumorId, direction) {
        if (!this.canAfford(amount)) {
            throw new Error(`Insufficient reputation. Need ${amount}, have ${this.balance}`);
        }

        await this.subtractReputation(amount, `Staked on rumor ${rumorId.substring(0, 8)}`);
        return true;
    }

    async slash(amount, reason) {
        // Burn tokens (permanent loss)
        await this.subtractReputation(amount, reason);

        // Check if high-rep user (>500) for additional penalty
        if (this.balance > CONFIG.HIGH_REP_THRESHOLD) {
            const penalty = Math.floor(this.balance * CONFIG.HIGH_REP_PENALTY);
            await this.subtractReputation(penalty, 'High-reputation penalty');
        }
    }

    async reward(amount, reason) {
        await this.addReputation(amount, reason);
    }

    async applyDecay() {
        const now = Date.now();
        const timeSinceLastDecay = now - this.lastDecay;

        // Check if decay period has passed
        if (timeSinceLastDecay >= CONFIG.DECAY_INTERVAL_MS) {
            const decayFactor = 1 - CONFIG.REPUTATION_DECAY_RATE;
            const oldBalance = this.balance;
            this.balance = Math.floor(this.balance * decayFactor);

            this.history.push({
                amount: oldBalance - this.balance,
                reason: `Weekly ${CONFIG.REPUTATION_DECAY_RATE * 100}% decay`,
                timestamp: now,
                type: 'decay'
            });

            this.lastDecay = now;
            await this.save();
        }
    }

    async save() {
        await storage.put('reputation', {
            id: 'user',
            balance: this.balance,
            history: this.history,
            lastDecay: this.lastDecay
        });
    }

    getHistory() {
        return this.history.slice().reverse(); // Most recent first
    }
}

// Global reputation manager
const reputationManager = new ReputationManager();
