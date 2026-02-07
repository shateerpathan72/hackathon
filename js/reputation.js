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

    getCredibilityScore() {
        // Credibility formula based on:
        // 1. Current reputation (70% weight)
        // 2. Account age (20% weight)
        // 3. Voting consistency/win rate (10% weight)

        const accountAge = Date.now() - identityManager.identity.createdAt;
        const daysSinceCreation = accountAge / (24 * 60 * 60 * 1000);

        // Reputation score (0-100, capped at 1000 rep)
        const repScore = Math.min((this.balance / 1000) * 100, 100);

        // Age score (0-100, maxes out at 30 days)
        const ageScore = Math.min((daysSinceCreation / 30) * 100, 100);

        // Win rate score (0-100)
        const winRate = this.calculateWinRate();
        const consistencyScore = winRate * 100;

        // Weighted average
        const credibility = (repScore * 0.7) + (ageScore * 0.2) + (consistencyScore * 0.1);

        return Math.round(credibility);
    }

    calculateWinRate() {
        // Calculate win rate from stake history
        const stakes = this.history.filter(h => h.type === 'gain' || h.type === 'loss');
        if (stakes.length === 0) return 0.5; // Neutral for new users

        const wins = this.history.filter(h =>
            h.type === 'gain' && h.reason.includes('reward')
        ).length;

        const total = this.history.filter(h =>
            (h.type === 'gain' && h.reason.includes('reward')) ||
            (h.type === 'loss' && h.reason.includes('Slashed'))
        ).length;

        return total > 0 ? wins / total : 0.5;
    }

    calculateVoteWeight(stake) {
        // Base vote weight from quadratic formula: votes = sqrt(stake)
        const baseVotes = Math.sqrt(stake);

        // Reputation multiplier (logarithmic scaling)
        // Users with higher rep get more influence
        const repMultiplier = 1 + Math.log10(Math.max(this.balance, 100) / 100);

        const weight = baseVotes * repMultiplier;

        console.log('Vote weight calculation:', {
            stake,
            baseVotes: baseVotes.toFixed(2),
            reputation: this.balance,
            repMultiplier: repMultiplier.toFixed(2),
            finalWeight: weight.toFixed(2)
        });

        return weight;
    }

    getHistory() {
        return this.history.slice().reverse(); // Most recent first
    }
}

// Global reputation manager
const reputationManager = new ReputationManager();
