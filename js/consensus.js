// Consensus and settlement logic
class ConsensusManager {
    constructor() {
        this.checkInterval = null;
    }

    async init() {
        // Start periodic checking for sealing conditions
        this.startMonitoring();
    }

    startMonitoring() {
        // Check every 10 seconds
        this.checkInterval = setInterval(async () => {
            await this.checkAllRumors();
        }, 10000);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    async checkAllRumors() {
        const rumors = await rumorManager.getAllRumors();

        for (const rumor of rumors) {
            if (!rumor.sealed) {
                await this.checkSealingConditions(rumor.id);
            }
        }
    }

    async checkSealingConditions(rumorId) {
        const rumor = await rumorManager.getRumor(rumorId);
        if (!rumor || rumor.sealed) return false;

        const now = Date.now();
        const age = now - rumor.timestamp;

        // Check 48-hour timeout
        if (age >= CONFIG.SEALING_TIME_MS) {
            await this.sealRumor(rumorId, 'timeout');
            return true;
        }

        // Check for supermajority (66%) - use WEIGHTED VOTES, not just stake
        const trueVotes = rumor.votes.true.count; // Now using weighted votes
        const falseVotes = rumor.votes.false.count;
        const totalVotes = trueVotes + falseVotes;

        if (totalVotes > 0) {
            const trueRatio = trueVotes / totalVotes;
            const falseRatio = falseVotes / totalVotes;

            console.log('Consensus check:', {
                rumorId: rumorId.substring(0, 8),
                trueVotes: trueVotes.toFixed(2),
                falseVotes: falseVotes.toFixed(2),
                trueRatio: (trueRatio * 100).toFixed(1) + '%',
                supermajority: (CONFIG.SUPERMAJORITY_THRESHOLD * 100) + '%'
            });

            if (trueRatio >= CONFIG.SUPERMAJORITY_THRESHOLD) {
                await this.sealRumor(rumorId, 'true');
                return true;
            } else if (falseRatio >= CONFIG.SUPERMAJORITY_THRESHOLD) {
                await this.sealRumor(rumorId, 'false');
                return true;
            }
        }

        return false;
    }

    async sealRumor(rumorId, outcome) {
        const rumor = await rumorManager.getRumor(rumorId);
        if (!rumor) return;

        // Determine outcome if timeout - use WEIGHTED VOTES
        if (outcome === 'timeout') {
            const trueVotes = rumor.votes.true.count;
            const falseVotes = rumor.votes.false.count;

            if (trueVotes > falseVotes) {
                outcome = 'true';
            } else if (falseVotes > trueVotes) {
                outcome = 'false';
            } else {
                outcome = 'tie'; // No consensus
            }
        }

        // Seal the rumor
        await rumorManager.sealRumor(rumorId, outcome);

        // Distribute rewards and slash losers
        await this.distributeRewards(rumorId, outcome);

        // Show notification
        showToast(`Rumor sealed as ${outcome.toUpperCase()}!`, 'info');
    }

    async distributeRewards(rumorId, outcome) {
        const rumor = await rumorManager.getRumor(rumorId);
        const votes = await votingManager.getVotesForRumor(rumorId);
        const currentUserId = identityManager.getUserId();

        if (outcome === 'tie') {
            // Return stakes to everyone
            for (const vote of votes) {
                if (vote.voterId === currentUserId) {
                    await reputationManager.reward(vote.stake, `Stake returned (tie) - ${rumorId.substring(0, 8)}`);
                }
            }
            return;
        }

        // Separate winners and losers
        const winners = votes.filter(v => v.direction === outcome);
        const losers = votes.filter(v => v.direction !== outcome);

        // Calculate pools
        const winnerPool = winners.reduce((sum, v) => sum + v.stake, 0);
        const loserPool = losers.reduce((sum, v) => sum + v.stake, 0);

        // Distribute to current user if they voted
        const userVote = votes.find(v => v.voterId === currentUserId);

        if (userVote) {
            if (userVote.direction === outcome) {
                // Winner: get stake back + proportional share of loser pool
                const baseReturn = userVote.stake;
                const bonus = winnerPool > 0 ? (userVote.stake / winnerPool) * loserPool : 0;
                const totalReward = Math.floor(baseReturn + bonus);

                await reputationManager.reward(totalReward, `Won vote on ${rumorId.substring(0, 8)}`);
                showToast(`🎉 You won ${totalReward}⭐!`, 'success');
            } else {
                // Loser: stake is burned
                await reputationManager.slash(0, `Lost vote on ${rumorId.substring(0, 8)}`);
                showToast(`😞 You lost ${userVote.stake}⭐`, 'error');
            }
        }

        // Return author's stake if rumor was verified as true
        if (outcome === 'true' && rumor.authorId === currentUserId) {
            await reputationManager.reward(CONFIG.MIN_POST_STAKE, `Rumor verified - ${rumorId.substring(0, 8)}`);
            showToast(`✅ Your rumor was verified! +${CONFIG.MIN_POST_STAKE}⭐`, 'success');
        }
    }
}

// Global consensus manager
const consensusManager = new ConsensusManager();
