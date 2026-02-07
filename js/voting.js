// Voting system with quadratic cost and stake tracking
class VotingManager {
    constructor() {
        this.votes = [];
    }

    async init() {
        this.votes = await storage.getAll('votes');
        return this.votes;
    }

    async vote(rumorId, direction, numVotes) {
        // Validate direction
        if (direction !== 'true' && direction !== 'false') {
            throw new Error('Invalid vote direction');
        }

        // Check if already voted
        if (await this.hasVoted(rumorId)) {
            throw new Error('You have already voted on this rumor');
        }

        // Check if rumor exists and is not sealed
        const rumor = await rumorManager.getRumor(rumorId);
        if (!rumor) {
            throw new Error('Rumor not found');
        }
        if (rumor.sealed) {
            throw new Error('Rumor is already sealed');
        }

        // Check cooldown for new accounts
        if (identityManager.isNewAccount()) {
            // Check if rumor is trending (has significant votes)
            const totalStake = rumor.votes.true.stake + rumor.votes.false.stake;
            if (totalStake > 100) { // Trending threshold
                throw new Error('New accounts cannot vote on trending rumors (7-day cooldown)');
            }
        }

        // SYBIL DEFENSE: Check Device Fingerprint
        // Ensure this device hasn't already voted on this rumor with ANY account
        const currentDeviceId = identityManager.fingerprint;
        const previousVotesOnRumor = this.votes.filter(v => v.rumorId === rumorId);

        // We need to check if any previous vote has the same deviceId
        // However, we didn't store deviceId in votes before.
        // We need to start storing it.
        // For old votes without deviceId, we can't enforce this.
        const deviceAlreadyVoted = previousVotesOnRumor.some(v => v.deviceId === currentDeviceId);

        if (deviceAlreadyVoted && CONFIG.ENABLE_FINGERPRINT) {
            throw new Error('This device has already voted on this rumor!');
        }

        // Calculate cost
        const cost = reputationManager.calculateVoteCost(numVotes);

        // Check balance
        if (!reputationManager.canAfford(cost)) {
            throw new Error(`Insufficient reputation. Need ${cost}⭐, have ${reputationManager.balance}⭐`);
        }

        // Calculate vote weight based on stake and reputation
        const voteWeight = reputationManager.calculateVoteWeight(cost);
        const voterReputation = reputationManager.balance;

        // Create vote record
        const voteData = {
            rumorId,
            direction,
            numVotes, // Keep for backwards compatibility
            stake: cost,
            voteWeight, // NEW: Actual weighted votes
            voterReputation, // NEW: Snapshot of voter's rep at time of vote
            voterId: identityManager.getUserId(),
            timestamp: Date.now(),
            // SYBIL DEFENSE
            deviceId: identityManager.fingerprint
        };

        // Sign vote
        const signature = await identityManager.signMessage(voteData);

        // Generate vote ID
        const voteString = JSON.stringify(voteData);
        const hash = await identityManager.hashString(voteString);
        const id = identityManager.bufferToHex(hash).substring(0, 16);

        const vote = {
            id,
            ...voteData,
            signature,
            publicKey: identityManager.identity.publicKey
        };

        // Stake tokens
        await reputationManager.stake(cost, rumorId, direction);

        // Save vote
        await storage.put('votes', vote);
        this.votes.push(vote);

        // Update rumor votes with weighted votes
        await rumorManager.updateVotes(rumorId, direction, voteWeight, cost, vote.voterId, voterReputation);

        console.log('Vote cast:', {
            rumorId: rumorId.substring(0, 8),
            direction,
            stake: cost,
            baseVotes: numVotes,
            weightedVotes: voteWeight.toFixed(2),
            voterRep: voterReputation
        });

        return vote;
    }

    async hasVoted(rumorId) {
        const userId = identityManager.getUserId();
        return this.votes.some(v => v.rumorId === rumorId && v.voterId === userId);
    }

    async getUserVote(rumorId) {
        const userId = identityManager.getUserId();
        return this.votes.find(v => v.rumorId === rumorId && v.voterId === userId);
    }

    async getVotesForRumor(rumorId) {
        return this.votes.filter(v => v.rumorId === rumorId);
    }

    getVoteCost(numVotes) {
        return reputationManager.calculateVoteCost(numVotes);
    }

    // P2P: Add vote received from peer
    async addReceivedVote(vote) {
        // Check if already exists
        if (this.votes.some(v => v.id === vote.id)) {
            console.log('P2P: Vote already exists', vote.id);
            return;
        }

        // Check if voter already voted on this rumor (prevent double voting)
        if (this.votes.some(v => v.rumorId === vote.rumorId && v.voterId === vote.voterId)) {
            console.warn('P2P: Voter already voted on this rumor', vote.voterId, vote.rumorId);
            return;
        }

        // Add to storage and cache
        await storage.put('votes', vote);
        this.votes.push(vote);

        // Update rumor vote counts
        await rumorManager.updateVotes(vote.rumorId, vote.direction, vote.numVotes, vote.stake, vote.voterId);

        console.log('P2P: Added vote from peer', vote.id);
    }
}

// Global voting manager
const votingManager = new VotingManager();
