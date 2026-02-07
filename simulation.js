// Simulation of Voting Scenarios
// Run directly in Node.js to verify logic

const CONFIG = {
    INITIAL_REPUTATION: 100,
    VOTE_STAKE_MULTIPLIER: 10,
    QUADRATIC_VOTING: true,
    ENABLE_DECAY: false,
    HIGH_REP_THRESHOLD: 500
};

class MockReputationManager {
    constructor(initialBalance = 100) {
        this.balance = initialBalance;
    }

    calculateVoteCost(numVotes) {
        return numVotes * numVotes; // Quadratic cost
    }

    calculateVoteWeight(cost) {
        // Simplified weight logic from reputation.js
        // weight = log2(stake + 1) * log10(reputation + 10)
        const stakeWeight = Math.log2(cost + 1);
        const repMultiplier = Math.log10(this.balance + 10);
        return stakeWeight * repMultiplier;
    }

    canAfford(amount) {
        return this.balance >= amount;
    }

    stake(amount) {
        if (this.canAfford(amount)) {
            this.balance -= amount;
            return true;
        }
        return false;
    }
}

// Log results
function logResult(scenario, result) {
    console.log(`\n=== Scenario: ${scenario} ===`);
    console.log(`Outcome: ${result.outcome}`);
    console.log(`Details: ${result.details}`);
}

// --- Scenarios ---

// 1. Honest Majority
function testHonestMajority() {
    console.log('\n----------------------------------------');
    console.log('Test 1: Honest Majority (3 vs 1)');
    console.log('----------------------------------------');

    // Setup users: 3 Honest (100 Rep), 1 Liar (100 Rep)
    const honest1 = new MockReputationManager(100);
    const honest2 = new MockReputationManager(100);
    const honest3 = new MockReputationManager(100);
    const liar = new MockReputationManager(100);

    // Vote Logic
    // All vote with 1 "vote unit" (cost = 1^2 = 1)
    const cost = 1;

    // Calculate weights
    const h1W = honest1.calculateVoteWeight(cost);
    const h2W = honest2.calculateVoteWeight(cost);
    const h3W = honest3.calculateVoteWeight(cost);
    const liarW = liar.calculateVoteWeight(cost);

    const totalHonestWeight = h1W + h2W + h3W;
    const totalLiarWeight = liarW;

    console.log(`Honest 1 Weight: ${h1W.toFixed(2)}`);
    console.log(`Honest Total Weight: ${totalHonestWeight.toFixed(2)}`);
    console.log(`Liar Total Weight:   ${totalLiarWeight.toFixed(2)}`);

    if (totalHonestWeight > totalLiarWeight) {
        logResult('Honest Majority', { outcome: 'HONEST WINS ✅', details: 'Majority weight carried the vote.' });
    } else {
        logResult('Honest Majority', { outcome: 'LIAR WINS ❌', details: 'Something is wrong with the math.' });
    }
}

// 2. The Liar Group Attack (Sybil)
function testLiarGroup() {
    console.log('\n----------------------------------------');
    console.log('Test 2: Liar Group Attack (Sybil)');
    console.log('----------------------------------------');
    console.log('Setup: 1 Expert (1000 Rep) vs 5 Sybils (10 Rep each)');

    // 1 High Reputation User (The "Expert")
    const expert = new MockReputationManager(1000);

    // 5 Low Reputation Users ("Sybil Bots")
    const liars = Array(5).fill(null).map(() => new MockReputationManager(10));

    // Voting
    const cost = 1; // Standard vote

    const expertWeight = expert.calculateVoteWeight(cost);

    let liarTotalWeight = 0;
    liars.forEach(l => {
        liarTotalWeight += l.calculateVoteWeight(cost);
    });

    console.log(`Expert Weight (1000 Rep): ${expertWeight.toFixed(2)}`);
    console.log(`Liar Group Weight (5x 10 Rep): ${liarTotalWeight.toFixed(2)}`);

    if (expertWeight > liarTotalWeight) {
        logResult('Liar Group Attack', { outcome: 'EXPERT WINS ✅', details: 'High reputation outweighed the Sybil group.' });
    } else {
        logResult('Liar Group Attack', { outcome: 'SYBIL WINS ❌', details: 'The mob overpowered the expert.' });
    }
}

// 3. Conflict / Tie
function testTie() {
    console.log('\n----------------------------------------');
    console.log('Test 3: The Tie (Equal Weight)');
    console.log('----------------------------------------');

    const userA = new MockReputationManager(100);
    const userB = new MockReputationManager(100);

    const weightA = userA.calculateVoteWeight(1);
    const weightB = userB.calculateVoteWeight(1);

    console.log(`User A Weight: ${weightA.toFixed(2)}`);
    console.log(`User B Weight: ${weightB.toFixed(2)}`);

    if (Math.abs(weightA - weightB) < 0.01) {
        logResult('Tie', { outcome: 'TIE ✅', details: 'Weights are equal. Status remains PENDING.' });
    } else {
        logResult('Tie', { outcome: 'DECISIVE ❌', details: 'One side won unexpectedly.' });
    }
}

// 4. Liar Penalty & Reputation Gain
function testLiarPenalty() {
    console.log('\n----------------------------------------');
    console.log('Test 4: Liar Penalty & Reputation Gain');
    console.log('----------------------------------------');

    // Scenario: 3 Honest vs 1 Liar on a rumor
    // Honest stake: 10 each
    // Liar stake: 10
    // Outcome: TRUE (Honest wins)

    const honestStake = 10;
    const liarStake = 10;
    const totalHonestStake = honestStake * 3;
    const totalLiarStake = liarStake;

    console.log(`Honest Total Stake: ${totalHonestStake}`);
    console.log(`Liar Total Stake:   ${totalLiarStake}`);

    // Simulation of reward distribution
    // Winners get their stake back + share of losers' stake
    const rewardPool = totalLiarStake;
    const rewardPerHonest = rewardPool / 3;

    console.log(`Reward Pool (Liar's lost stake): ${rewardPool}`);
    console.log(`Reward per Honest User: ${rewardPerHonest.toFixed(2)}`);

    // Verification
    if (rewardPool > 0 && rewardPerHonest > 0) {
        logResult('Liar Penalty', { outcome: 'PENALTY APPLIED ✅', details: `Liar lost ${liarStake}, Honest gained ${rewardPerHonest.toFixed(2)} each.` });
    } else {
        logResult('Liar Penalty', { outcome: 'FAILED ❌', details: 'No penalty or reward calculated.' });
    }
}

// Run All
testHonestMajority();
testLiarGroup();
testTie();
testLiarPenalty();
