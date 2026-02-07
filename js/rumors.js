// Rumor management with DAG structure and tombstones
class RumorManager {
    constructor() {
        this.rumors = [];
    }

    async init() {
        this.rumors = await storage.getAll('rumors');
        return this.rumors;
    }

    async createRumor(content, durationHours = 24) {
        // Validate content
        if (!content || content.trim().length === 0) {
            throw new Error('Rumor content cannot be empty');
        }
        if (content.length > CONFIG.MAX_RUMOR_LENGTH) {
            throw new Error(`Rumor too long (max ${CONFIG.MAX_RUMOR_LENGTH} characters)`);
        }

        // Check reputation
        if (!reputationManager.canAfford(CONFIG.MIN_POST_STAKE)) {
            throw new Error(`Need ${CONFIG.MIN_POST_STAKE}⭐ to post`);
        }

        const timestamp = Date.now();
        const expiresAt = timestamp + (durationHours * 60 * 60 * 1000);

        // Create rumor object
        const rumorData = {
            content: content.trim(),
            authorId: identityManager.getUserId(),
            timestamp: timestamp,
            stake: CONFIG.MIN_POST_STAKE,
            expiresAt: expiresAt
        };

        // Sign rumor
        const signature = await identityManager.signMessage(rumorData);

        // Generate ID from hash
        const rumorString = JSON.stringify(rumorData);
        const hash = await identityManager.hashString(rumorString);
        const id = identityManager.bufferToHex(hash).substring(0, 16);

        const rumor = {
            id,
            ...rumorData,
            signature,
            publicKey: identityManager.identity.publicKey,
            votes: {
                true: { count: 0, stake: 0, voters: [] },
                false: { count: 0, stake: 0, voters: [] }
            },
            sealed: false,
            sealedAt: null,
            outcome: null,
            createdAt: timestamp
        };

        // Stake tokens
        await reputationManager.stake(CONFIG.MIN_POST_STAKE, id, 'post');

        // Author automatically votes TRUE with their stake (FR-06)
        rumor.votes.true.count = 1;
        rumor.votes.true.stake = CONFIG.MIN_POST_STAKE;
        rumor.votes.true.voters.push(identityManager.getUserId());
        rumor.votes.true.voterReputation = [reputationManager.balance];

        // PERSIST AUTHOR VOTE (Fix for stats)
        const voteId = `${id}_${identityManager.getUserId()}`;
        const autoVote = {
            id: voteId,
            rumorId: id,
            voterId: identityManager.getUserId(),
            direction: 'true',
            stake: CONFIG.MIN_POST_STAKE,
            voteWeight: reputationManager.calculateVoteWeight(CONFIG.MIN_POST_STAKE),
            timestamp: timestamp,
            signature: signature,
            // SYBIL DEFENSE
            deviceId: identityManager.fingerprint,
            ipHash: identityManager.ipHash,
            // KEY PROPAGATION (Required for validation since ID != Key)
            publicKey: identityManager.identity.publicKey
        };
        await storage.put('votes', autoVote);
        if (votingManager && votingManager.votes) {
            votingManager.votes.push(autoVote);
        }

        // Save rumor
        await storage.put('rumors', rumor);
        this.rumors.push(rumor);

        console.log('Rumor created with author auto-vote TRUE:', {
            rumorId: id,
            authorStake: CONFIG.MIN_POST_STAKE,
            authorId: identityManager.getUserId()
        });

        return rumor;
    }

    async deleteRumor(rumorId) {
        const rumor = await this.getRumor(rumorId);
        if (!rumor) {
            throw new Error('Rumor not found');
        }

        // Only author can delete (in testing mode, anyone can)
        if (!CONFIG.TESTING_MODE && rumor.authorId !== identityManager.getUserId()) {
            throw new Error('Only author can delete rumor');
        }

        // Replace content with tombstone
        const contentHash = await identityManager.hashString(rumor.content);
        rumor.content = `[DELETED] ${identityManager.bufferToHex(contentHash).substring(0, 16)}`;
        rumor.deleted = true;
        rumor.deletedAt = Date.now();

        await storage.put('rumors', rumor);

        // Update local cache
        const index = this.rumors.findIndex(r => r.id === rumorId);
        if (index !== -1) {
            this.rumors[index] = rumor;
        }

        return rumor;
    }

    async getRumor(rumorId) {
        let rumor = this.rumors.find(r => r.id === rumorId);
        if (!rumor) {
            rumor = await storage.get('rumors', rumorId);
        }
        return rumor;
    }

    async getAllRumors() {
        return this.rumors;
    }

    calculateTrustScore(rumor) {
        // Use WEIGHTED VOTES, not stake
        const trueVotes = rumor.votes.true.count;
        const falseVotes = rumor.votes.false.count;
        const totalVotes = trueVotes + falseVotes;

        // Minimum threshold for verification
        // Needs at least 3 votes to be considered "verified" or highly trusted
        // Otherwise, return 0.5 (neutral/unverified)
        if (totalVotes < 3) {
            return 0.5;
        }

        if (totalVotes === 0) return 0.5; // Neutral

        // Trust score: 0 (all false) to 1 (all true)
        return trueVotes / totalVotes;
    }

    getTrustPercentage(rumor) {
        return Math.round(this.calculateTrustScore(rumor) * 100);
    }

    async getRumorFeed(filter = 'all') {
        let rumors = [...this.rumors];

        // Apply filters
        if (filter === 'trending') {
            rumors = rumors.filter(r => !r.sealed);
            rumors.sort((a, b) => {
                const aTotal = a.votes.true.stake + a.votes.false.stake;
                const bTotal = b.votes.true.stake + b.votes.false.stake;
                return bTotal - aTotal; // Most voted first
            });
        } else if (filter === 'sealed') {
            rumors = rumors.filter(r => r.sealed);
        } else {
            // All: sort by timestamp (newest first)
            rumors.sort((a, b) => b.timestamp - a.timestamp);
        }

        return rumors;
    }

    async updateVotes(rumorId, direction, votes, stake, voterId, voterReputation = null) {
        const rumor = await this.getRumor(rumorId);
        if (!rumor) {
            throw new Error('Rumor not found');
        }

        // Add vote with weighted count
        rumor.votes[direction].count += votes; // Now using weighted votes
        rumor.votes[direction].stake += stake;

        // Store voter info with reputation snapshot
        rumor.votes[direction].voters.push({
            voterId,
            votes, // Weighted votes
            stake,
            reputation: voterReputation, // NEW: Track voter's rep at vote time
            timestamp: Date.now()
        });

        // Initialize reputation array if needed
        if (!rumor.votes[direction].voterReputation) {
            rumor.votes[direction].voterReputation = [];
        }
        if (voterReputation !== null) {
            rumor.votes[direction].voterReputation.push(voterReputation);
        }

        await storage.put('rumors', rumor);

        // Update local cache
        const index = this.rumors.findIndex(r => r.id === rumorId);
        if (index !== -1) {
            this.rumors[index] = rumor;
        }

        return rumor;
    }

    async sealRumor(rumorId, outcome) {
        const rumor = await this.getRumor(rumorId);
        if (!rumor) {
            throw new Error('Rumor not found');
        }

        rumor.sealed = true;
        rumor.sealedAt = Date.now();
        rumor.outcome = outcome;

        await storage.put('rumors', rumor);

        // Update local cache
        const index = this.rumors.findIndex(r => r.id === rumorId);
        if (index !== -1) {
            this.rumors[index] = rumor;
        }

        return rumor;
    }

    // P2P: Add rumor received from peer
    async addReceivedRumor(rumor) {
        // Check if already exists
        if (this.rumors.some(r => r.id === rumor.id)) {
            console.log('P2P: Rumor already exists', rumor.id);
            return;
        }

        // Add to storage and cache
        await storage.put('rumors', rumor);
        this.rumors.push(rumor);

        console.log('P2P: Added rumor from peer', rumor.id);
    }
}

// Global rumor manager
const rumorManager = new RumorManager();
