// UI helper functions
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => container.removeChild(toast), 300);
    }, CONFIG.TOAST_DURATION);
}

function formatTimestamp(timestamp, isFuture = false) {
    const now = Date.now();
    const diff = isFuture ? timestamp - now : now - timestamp;

    if (diff < 0) return isFuture ? 'Expired' : 'Just now';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${isFuture ? 'left' : 'ago'}`;
    if (hours > 0) return `${hours}h ${isFuture ? 'left' : 'ago'}`;
    if (minutes > 0) return `${minutes}m ${isFuture ? 'left' : 'ago'}`;
    return isFuture ? 'Ending soon' : 'Just now';
}

function formatUserId(userId) {
    return `@${userId.substring(0, 8)}`;
}

function updateBalance() {
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = reputationManager.balance;

        // Add animation
        balanceEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            balanceEl.style.transform = 'scale(1)';
        }, 200);
    }
}

function renderRumorCard(rumor) {
    const trustScore = rumorManager.getTrustPercentage(rumor);
    const hasVoted = votingManager.votes.some(v => v.rumorId === rumor.id && v.voterId === identityManager.getUserId());

    const card = document.createElement('div');
    card.className = 'rumor-card';
    card.dataset.rumorId = rumor.id;

    card.innerHTML = `
        <div class="rumor-header">
            <span class="rumor-author">${formatUserId(rumor.authorId)}</span>
            <span class="rumor-time">
                ${formatTimestamp(rumor.timestamp)} 
                ${rumor.expiresAt && !rumor.sealed ? ` • ⏳ Ends in ${formatTimestamp(rumor.expiresAt, true)}` : ''}
            </span>
        </div>
        
        <div class="rumor-content ${rumor.deleted ? 'tombstone' : ''}">
            ${rumor.deleted ? '🪦 ' + rumor.content : rumor.content}
        </div>
        
        <div class="trust-score">
            <div class="trust-label">Trust Score: ${trustScore}%</div>
            <div class="trust-bar">
                <div class="trust-fill" style="width: ${trustScore}%"></div>
            </div>
        </div>
        
        <div class="vote-stats">
            <div class="stat true">
                ✅ ${rumor.votes.true.count} votes (${rumor.votes.true.stake}⭐)
            </div>
            <div class="stat false">
                ❌ ${rumor.votes.false.count} votes (${rumor.votes.false.stake}⭐)
            </div>
        </div>
        
        ${rumor.sealed ? `
            <div class="sealed-badge">
                ${rumor.outcome === 'true' ? '✅ VERIFIED' : rumor.outcome === 'false' ? '❌ FALSE' : '⚖️ TIE'}
            </div>
        ` : `
            <div class="rumor-actions">
                <button class="btn-secondary vote-btn" data-rumor-id="${rumor.id}" ${hasVoted ? 'disabled' : ''}>
                    ${hasVoted ? '✓ Voted' : '🗳️ Vote'}
                </button>
                ${rumor.authorId === identityManager.getUserId() && !rumor.deleted ? `
                    <button class="btn-secondary delete-btn" data-rumor-id="${rumor.id}">
                        🗑️ Delete
                    </button>
                    <button class="btn-secondary end-vote-btn" data-rumor-id="${rumor.id}" style="border-color: #ef4444; color: #ef4444;">
                        ⏳ End Vote
                    </button>
                ` : ''}
            </div>
        `}
    `;

    return card;
}

async function renderFeed(filter = 'all') {
    const feedEl = document.getElementById('rumorFeed');
    const rumors = await rumorManager.getRumorFeed(filter);

    if (rumors.length === 0) {
        feedEl.innerHTML = `
            <div class="empty-state">
                <p>🌟 No rumors yet. Be the first to post!</p>
            </div>
        `;
        return;
    }

    feedEl.innerHTML = '';
    rumors.forEach(rumor => {
        feedEl.appendChild(renderRumorCard(rumor));
    });

    // Attach event listeners
    attachFeedListeners();
}

function attachFeedListeners() {
    // Vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rumorId = e.target.dataset.rumorId;
            openVoteModal(rumorId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rumorId = e.target.dataset.rumorId;
            if (confirm('Delete this rumor? It will be replaced with a tombstone.')) {
                try {
                    await rumorManager.deleteRumor(rumorId);
                    showToast('Rumor deleted', 'info');
                    await renderFeed();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    });

    // End Vote buttons (Demo)
    document.querySelectorAll('.end-vote-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rumorId = e.target.dataset.rumorId;
            if (confirm('Force end voting now? (Demo Feature)')) {
                try {
                    await consensusManager.finalizeRumor(rumorId);
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    });
}

function openVoteModal(rumorId) {
    const modal = document.getElementById('voteModal');
    const rumor = rumorManager.rumors.find(r => r.id === rumorId);

    if (!rumor) return;

    // Set rumor text
    document.getElementById('modalRumorText').textContent = rumor.content;

    // Store rumor ID
    modal.dataset.rumorId = rumorId;

    // Reset selections
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('voteAmount').value = 10; // Default 10 tokens
    updateVoteCost();

    // Show modal
    modal.classList.add('active');
}

function closeVoteModal() {
    const modal = document.getElementById('voteModal');
    modal.classList.remove('active');
    delete modal.dataset.rumorId;
    delete modal.dataset.direction;
}

function updateVoteCost() {
    const stake = parseInt(document.getElementById('voteAmount').value) || 10;
    const voteWeight = reputationManager.calculateVoteWeight(stake);

    // Update display
    document.getElementById('voteWeight').textContent = voteWeight.toFixed(1);
    document.getElementById('voterRep').textContent = reputationManager.balance;
}

async function submitVote() {
    const modal = document.getElementById('voteModal');
    const rumorId = modal.dataset.rumorId;
    const direction = modal.dataset.direction;
    const stake = parseInt(document.getElementById('voteAmount').value) || 10;

    if (!rumorId || !direction) {
        showToast('Please select TRUE or FALSE', 'error');
        return;
    }

    try {
        // Calculate numVotes from stake for backwards compatibility
        const numVotes = Math.sqrt(stake);
        const vote = await votingManager.vote(rumorId, direction, numVotes);

        // Broadcast to P2P network
        await p2pManager.broadcastVote(vote);

        const voteWeight = vote.voteWeight.toFixed(1);
        showToast(`Vote submitted! (${stake}⭐ = ${voteWeight} weighted votes)`, 'success');
        updateBalance();
        closeVoteModal();
        await renderFeed();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Settings panel
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

function updateSettingsUI() {
    document.getElementById('enableCooldown').checked = CONFIG.ENABLE_COOLDOWN;
    document.getElementById('enableFingerprint').checked = CONFIG.ENABLE_FINGERPRINT;
    document.getElementById('enableDecay').checked = CONFIG.ENABLE_DECAY;
}

async function resetApp() {
    if (confirm('Reset all app data? This cannot be undone!')) {
        await storage.clearAll();
        location.reload();
    }
}

async function addTestTokens() {
    await reputationManager.addReputation(100, 'Testing tokens');
    updateBalance();
    showToast('Added 100⭐ for testing', 'success');
}
