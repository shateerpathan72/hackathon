// Dashboard functionality for Rumorality
class DashboardManager {
    constructor() {
        this.credibilityHistory = [];
    }

    async init() {
        // Load credibility history from storage
        const history = await storage.getAll('credibilityHistory');
        this.credibilityHistory = history || [];

        // Update header credibility
        this.updateHeaderCredibility();
    }

    openDashboard() {
        const modal = document.getElementById('dashboardModal');
        modal.classList.add('active');

        // Populate dashboard with current data
        this.populateDashboard();
    }

    closeDashboard() {
        const modal = document.getElementById('dashboardModal');
        modal.classList.remove('active');
    }

    async populateDashboard() {
        // Get credibility score
        const credibility = reputationManager.getCredibilityScore();

        // Update credibility circle
        this.updateCredibilityCircle(credibility);

        // Update stats
        await this.updateStats();

        // Update voting history
        await this.updateVotingHistory();

        // Update credibility graph
        this.updateCredibilityGraph();
    }

    updateCredibilityCircle(score) {
        // Update score displays
        document.getElementById('dashboardCredibility').textContent = score;
        document.getElementById('headerCredibility').textContent = score;

        // Update circle progress (534 is circumference of circle with r=85)
        const circle = document.getElementById('credibilityCircle');
        const circumference = 534;
        const offset = circumference - (score / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Update breakdown
        const accountAge = Date.now() - identityManager.identity.createdAt;
        const daysSinceCreation = accountAge / (24 * 60 * 60 * 1000);
        const winRate = reputationManager.calculateWinRate();

        const repScore = Math.min((reputationManager.balance / 1000) * 100, 100);
        const ageScore = Math.min((daysSinceCreation / 30) * 100, 100);
        const consistencyScore = winRate * 100;

        document.getElementById('credBalanceContrib').textContent = repScore.toFixed(1);
        document.getElementById('credAgeContrib').textContent = ageScore.toFixed(1);
        document.getElementById('credWinRateContrib').textContent = consistencyScore.toFixed(1);
    }

    async updateStats() {
        const votes = votingManager.votes;
        const rumors = rumorManager.rumors;
        const userId = identityManager.getUserId();

        // Count user's rumors
        const userRumors = rumors.filter(r => r.authorId === userId);

        // Count wins and losses
        let wins = 0;
        let losses = 0;
        let pending = 0;

        for (const vote of votes) {
            const rumor = await rumorManager.getRumor(vote.rumorId);
            if (rumor && rumor.sealed) {
                if (vote.direction === rumor.outcome) {
                    wins++;
                } else {
                    losses++;
                }
            } else {
                pending++;
            }
        }

        // Update UI
        document.getElementById('totalVotesCount').textContent = votes.length;
        document.getElementById('totalRumorsCount').textContent = userRumors.length;
        document.getElementById('votesWonCount').textContent = wins;
        document.getElementById('votesLostCount').textContent = losses;

        // Update win rate bar
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        document.getElementById('winRateFill').style.width = winRate + '%';
        document.getElementById('winRateText').textContent = winRate.toFixed(0) + '%';
    }

    async updateVotingHistory() {
        const votes = votingManager.votes;
        const historyContainer = document.getElementById('voteHistoryList');

        if (votes.length === 0) {
            historyContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No voting history yet. Start voting to see your track record!
                </div>
            `;
            return;
        }

        // Sort votes by timestamp (newest first)
        const sortedVotes = [...votes].sort((a, b) => b.timestamp - a.timestamp);

        // Build HTML
        let html = '';
        for (const vote of sortedVotes.slice(0, 20)) { // Show last 20 votes
            const rumor = await rumorManager.getRumor(vote.rumorId);
            if (!rumor) continue;

            let status = 'pending';
            let statusText = '⏳ Pending';
            let statusClass = 'pending';

            if (rumor.sealed) {
                if (vote.direction === rumor.outcome) {
                    status = 'win';
                    statusText = '✅ Won';
                    statusClass = 'win';
                } else {
                    status = 'loss';
                    statusText = '❌ Lost';
                    statusClass = 'loss';
                }
            }

            const timeAgo = this.getTimeAgo(vote.timestamp);
            const rumorPreview = rumor.content.substring(0, 60) + (rumor.content.length > 60 ? '...' : '');

            html += `
                <div class="vote-item ${statusClass}">
                    <div class="vote-item-header">
                        <span class="vote-direction ${vote.direction}">${vote.direction.toUpperCase()}</span>
                        <span class="vote-outcome ${statusClass}">${statusText}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0;">
                        "${rumorPreview}"
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
                        <span>Staked: ${vote.stake}⭐</span>
                        <span>Weight: ${vote.voteWeight ? vote.voteWeight.toFixed(1) : 'N/A'} votes</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            `;
        }

        historyContainer.innerHTML = html;
    }

    updateCredibilityGraph() {
        const canvas = document.getElementById('credibilityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Sample data - in real implementation, this would be historical data
        const dataPoints = this.generateCredibilityHistory();

        // Draw graph
        this.drawLineGraph(ctx, canvas.width, canvas.height, dataPoints);
    }

    generateCredibilityHistory() {
        // Generate sample credibility history based on reputation history
        const history = reputationManager.getHistory();
        const points = [];

        // Start with initial credibility
        let currentCred = 50; // Starting credibility
        points.push({ time: Date.now() - (30 * 24 * 60 * 60 * 1000), value: currentCred });

        // Add points based on reputation changes
        for (let i = 0; i < Math.min(history.length, 20); i++) {
            const event = history[i];
            if (event.type === 'gain' && event.reason.includes('Won')) {
                currentCred = Math.min(100, currentCred + 2);
            } else if (event.type === 'loss' && event.reason.includes('Lost')) {
                currentCred = Math.max(0, currentCred - 3);
            }
            points.push({ time: event.timestamp, value: currentCred });
        }

        // Add current credibility
        points.push({ time: Date.now(), value: reputationManager.getCredibilityScore() });

        return points;
    }

    drawLineGraph(ctx, width, height, dataPoints) {
        if (dataPoints.length < 2) {
            // Not enough data
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Not enough data yet', width / 2, height / 2);
            return;
        }

        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Find min/max values
        const values = dataPoints.map(p => p.value);
        const minValue = 0;
        const maxValue = 100;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(124, 111, 160, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            // Draw y-axis labels
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter';
            ctx.textAlign = 'right';
            const label = Math.round(maxValue - (maxValue / 5) * i);
            ctx.fillText(label.toString(), padding - 10, y + 4);
        }

        // Draw line
        ctx.strokeStyle = '#9B8BC4';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        dataPoints.forEach((point, index) => {
            const x = padding + (graphWidth / (dataPoints.length - 1)) * index;
            const y = padding + graphHeight - ((point.value - minValue) / (maxValue - minValue)) * graphHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw points
        ctx.fillStyle = '#7C6FA0';
        dataPoints.forEach((point, index) => {
            const x = padding + (graphWidth / (dataPoints.length - 1)) * index;
            const y = padding + graphHeight - ((point.value - minValue) / (maxValue - minValue)) * graphHeight;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw gradient fill under line
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(155, 139, 196, 0.3)');
        gradient.addColorStop(1, 'rgba(155, 139, 196, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        dataPoints.forEach((point, index) => {
            const x = padding + (graphWidth / (dataPoints.length - 1)) * index;
            const y = padding + graphHeight - ((point.value - minValue) / (maxValue - minValue)) * graphHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fill();
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    updateHeaderCredibility() {
        const credibility = reputationManager.getCredibilityScore();
        document.getElementById('headerCredibility').textContent = credibility;
    }

    // Save credibility snapshot for history
    async saveCredibilitySnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            score: reputationManager.getCredibilityScore(),
            balance: reputationManager.balance
        };

        this.credibilityHistory.push(snapshot);

        // Keep only last 100 snapshots
        if (this.credibilityHistory.length > 100) {
            this.credibilityHistory = this.credibilityHistory.slice(-100);
        }

        await storage.put('credibilityHistory', {
            id: 'history',
            snapshots: this.credibilityHistory
        });
    }
}

// Global dashboard manager
const dashboardManager = new DashboardManager();

// Global functions for onclick handlers
function openDashboard() {
    dashboardManager.openDashboard();
}

function closeDashboard() {
    dashboardManager.closeDashboard();
}
