// Main application controller
class App {
    constructor() {
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Rumorality...');

            // Initialize storage
            await storage.init();
            console.log('✓ Storage initialized');

            // Initialize identity
            await identityManager.init();
            console.log('✓ Identity initialized:', identityManager.getUserId());

            // Initialize reputation
            await reputationManager.init();
            console.log('✓ Reputation initialized:', reputationManager.balance);

            // Initialize rumors
            await rumorManager.init();
            console.log('✓ Rumors loaded:', rumorManager.rumors.length);

            // Initialize voting
            await votingManager.init();
            console.log('✓ Votes loaded:', votingManager.votes.length);

            // Initialize consensus
            await consensusManager.init();
            console.log('✓ Consensus monitoring started');

            // Initialize P2P networking
            await p2pManager.init(identityManager.getUserId());
            console.log('✓ P2P network initialized');

            // Initialize dashboard
            await dashboardManager.init();
            console.log('✓ Dashboard initialized');

            // Setup UI
            this.setupEventListeners();
            updateBalance();
            updateSettingsUI();
            await renderFeed();

            this.initialized = true;
            console.log('✅ Rumorality ready!');

            showToast('Welcome to Rumorality! 🍥', 'success');

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    setupEventListeners() {
        // Post rumor
        const postBtn = document.getElementById('postBtn');
        const rumorInput = document.getElementById('rumorInput');
        const charCount = document.getElementById('charCount');

        rumorInput.addEventListener('input', () => {
            charCount.textContent = `${rumorInput.value.length}/280`;
        });

        postBtn.addEventListener('click', async () => {
            const content = rumorInput.value.trim();

            if (!content) {
                showToast('Please enter rumor content', 'error');
                return;
            }

            try {
                const rumor = await rumorManager.createRumor(content);

                // Broadcast to P2P network
                await p2pManager.broadcastRumor(rumor);

                showToast('Rumor posted! 🎉', 'success');
                rumorInput.value = '';
                charCount.textContent = '0/280';
                updateBalance();
                await renderFeed();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

        // Feed filters
        document.querySelectorAll('.feed-controls button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Update active state
                document.querySelectorAll('.feed-controls button').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');

                // Render filtered feed
                const filter = e.target.dataset.filter;
                await renderFeed(filter);
            });
        });

        // Vote modal
        const modal = document.getElementById('voteModal');
        const closeBtn = modal.querySelector('.close');
        const confirmVoteBtn = document.getElementById('confirmVoteBtn');
        const voteAmount = document.getElementById('voteAmount');

        closeBtn.addEventListener('click', closeVoteModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeVoteModal();
            }
        });

        // Vote direction buttons
        document.querySelectorAll('.vote-btn[data-vote]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove previous selection
                document.querySelectorAll('.vote-btn[data-vote]').forEach(b => {
                    b.classList.remove('selected');
                });

                // Select this button
                e.target.classList.add('selected');
                modal.dataset.direction = e.target.dataset.vote;
            });
        });

        voteAmount.addEventListener('input', updateVoteCost);

        confirmVoteBtn.addEventListener('click', submitVote);

        // Settings
        const settingsToggle = document.getElementById('settingsToggle');
        settingsToggle.addEventListener('click', toggleSettings);

        document.getElementById('enableCooldown').addEventListener('change', (e) => {
            updateConfig('ENABLE_COOLDOWN', e.target.checked);
            showToast(`Cooldown ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });

        document.getElementById('enableFingerprint').addEventListener('change', (e) => {
            updateConfig('ENABLE_FINGERPRINT', e.target.checked);
            showToast(`Device binding ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });

        document.getElementById('enableDecay').addEventListener('change', (e) => {
            updateConfig('ENABLE_DECAY', e.target.checked);
            showToast(`Reputation decay ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });

        document.getElementById('resetApp').addEventListener('click', resetApp);
        document.getElementById('addTokens').addEventListener('click', addTestTokens);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modal
            if (e.key === 'Escape') {
                closeVoteModal();
            }

            // Ctrl/Cmd + Enter to post
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (document.activeElement === rumorInput) {
                    postBtn.click();
                }
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    consensusManager.stopMonitoring();
    p2pManager.destroy();
});
