// P2P Manager for WebRTC mesh networking
class P2PManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> connection
        this.myPeerId = null;
        this.isConnected = false;
    }

    async init(userId) {
        try {
            // Create PeerJS instance with user ID as peer ID
            this.myPeerId = `rumorality-${userId}`;

            this.peer = new Peer(this.myPeerId, {
                debug: 2, // Show debug logs
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            // Set up event handlers
            this.peer.on('open', (id) => {
                console.log('P2P: Connected with ID:', id);
                this.isConnected = true;
                this.updateStatus('connected', 0);
                showToast('P2P network connected!', 'success');
            });

            this.peer.on('connection', (conn) => {
                console.log('P2P: Incoming connection from', conn.peer);
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('P2P Error:', err);
                this.updateStatus('error', 0);

                if (err.type === 'unavailable-id') {
                    showToast('P2P: ID already in use (another device?)', 'error');
                } else {
                    showToast(`P2P Error: ${err.type}`, 'error');
                }
            });

            this.peer.on('disconnected', () => {
                console.log('P2P: Disconnected from signaling server');
                this.isConnected = false;
                this.updateStatus('disconnected', this.connections.size);
            });

            // Auto-discover and connect to peers
            this.startPeerDiscovery();

        } catch (error) {
            console.error('P2P Init Error:', error);
            this.updateStatus('error', 0);
        }
    }

    handleConnection(conn) {
        // Set up connection event handlers
        conn.on('open', () => {
            console.log('P2P: Connection established with', conn.peer);
            this.connections.set(conn.peer, conn);
            this.updateStatus('connected', this.connections.size);

            // Send initial sync request
            this.syncWithPeer(conn);
        });

        conn.on('data', async (data) => {
            console.log('P2P: Received data from', conn.peer, data);
            await this.handleIncomingData(data, conn);
        });

        conn.on('close', () => {
            console.log('P2P: Connection closed with', conn.peer);
            this.connections.delete(conn.peer);
            this.updateStatus('connected', this.connections.size);
        });

        conn.on('error', (err) => {
            console.error('P2P: Connection error with', conn.peer, err);
        });
    }

    async connectToPeer(peerId) {
        if (this.connections.has(peerId)) {
            console.log('P2P: Already connected to', peerId);
            return;
        }

        if (peerId === this.myPeerId) {
            console.log('P2P: Cannot connect to self');
            return;
        }

        try {
            console.log('P2P: Connecting to', peerId);
            const conn = this.peer.connect(peerId, { reliable: true });
            this.handleConnection(conn);
        } catch (error) {
            console.error('P2P: Failed to connect to', peerId, error);
        }
    }

    startPeerDiscovery() {
        // For demo: try to connect to known peer IDs
        // In production, this would use a discovery mechanism

        // Try connecting to peers every 10 seconds
        setInterval(() => {
            if (!this.isConnected) return;

            // Try connecting to potential peers (other user IDs)
            // This is a simple discovery - in production, use a proper discovery service
            const potentialPeers = this.generatePotentialPeerIds();

            potentialPeers.forEach(peerId => {
                if (!this.connections.has(peerId) && peerId !== this.myPeerId) {
                    this.connectToPeer(peerId);
                }
            });
        }, 10000);
    }

    generatePotentialPeerIds() {
        // For testing: generate some common peer IDs
        // In production, this would query a discovery service
        const peers = [];

        // Try to connect to peers based on rumors we've seen
        rumorManager.rumors.forEach(rumor => {
            const authorPeerId = `rumorality-${rumor.authorId}`;
            if (authorPeerId !== this.myPeerId) {
                peers.push(authorPeerId);
            }
        });

        return peers;
    }

    async syncWithPeer(conn) {
        try {
            // Get our latest data
            const myRumors = rumorManager.rumors;
            const myVotes = votingManager.votes;

            // Send sync request with our data hashes
            const syncRequest = {
                type: 'sync_request',
                rumorIds: myRumors.map(r => r.id),
                voteIds: myVotes.map(v => v.id),
                timestamp: Date.now()
            };

            conn.send(syncRequest);
        } catch (error) {
            console.error('P2P: Sync error', error);
        }
    }

    async handleIncomingData(data, conn) {
        try {
            switch (data.type) {
                case 'sync_request':
                    await this.handleSyncRequest(data, conn);
                    break;

                case 'sync_response':
                    await this.handleSyncResponse(data);
                    break;

                case 'new_rumor':
                    await this.handleNewRumor(data);
                    break;

                case 'new_vote':
                    await this.handleNewVote(data);
                    break;

                default:
                    console.warn('P2P: Unknown data type', data.type);
            }
        } catch (error) {
            console.error('P2P: Error handling incoming data', error);
        }
    }

    async handleSyncRequest(data, conn) {
        // Find rumors/votes we have that peer doesn't
        const missingRumors = rumorManager.rumors.filter(r => !data.rumorIds.includes(r.id));
        const missingVotes = votingManager.votes.filter(v => !data.voteIds.includes(v.id));

        // Send missing data
        if (missingRumors.length > 0 || missingVotes.length > 0) {
            conn.send({
                type: 'sync_response',
                rumors: missingRumors,
                votes: missingVotes,
                timestamp: Date.now()
            });
        }
    }

    async handleSyncResponse(data) {
        // Receive missing rumors and votes from peer
        let updated = false;

        // Add missing rumors
        for (const rumor of data.rumors) {
            if (await this.validateRumor(rumor)) {
                await rumorManager.addReceivedRumor(rumor);
                updated = true;
            }
        }

        // Add missing votes
        for (const vote of data.votes) {
            if (await this.validateVote(vote)) {
                await votingManager.addReceivedVote(vote);
                updated = true;
            }
        }

        if (updated) {
            await renderFeed();
            showToast('Synced new data from peer!', 'info');
        }
    }

    async handleNewRumor(data) {
        if (await this.validateRumor(data.rumor)) {
            await rumorManager.addReceivedRumor(data.rumor);
            await renderFeed();
            showToast('New rumor from peer!', 'info');
        }
    }

    async handleNewVote(data) {
        if (await this.validateVote(data.vote)) {
            await votingManager.addReceivedVote(data.vote);
            await renderFeed();
            showToast('New vote from peer!', 'info');
        }
    }

    async validateRumor(rumor) {
        // Validate signature
        const isValid = await identityManager.verifySignature(
            {
                content: rumor.content,
                timestamp: rumor.timestamp,
                stake: rumor.stake
            },
            rumor.signature,
            rumor.publicKey
        );

        if (!isValid) {
            console.warn('P2P: Invalid rumor signature');
            return false;
        }

        // Check if already exists
        if (rumorManager.rumors.some(r => r.id === rumor.id)) {
            return false;
        }

        // Check timestamp (reject if too old or in future)
        const age = Date.now() - rumor.timestamp;
        if (age < 0 || age > 7 * 24 * 60 * 60 * 1000) { // 7 days
            console.warn('P2P: Rumor timestamp out of range');
            return false;
        }

        return true;
    }

    async validateVote(vote) {
        // Validate signature
        const isValid = await identityManager.verifySignature(
            {
                rumorId: vote.rumorId,
                direction: vote.direction,
                numVotes: vote.numVotes,
                stake: vote.stake,
                timestamp: vote.timestamp
            },
            vote.signature,
            vote.publicKey
        );

        if (!isValid) {
            console.warn('P2P: Invalid vote signature');
            return false;
        }

        // Check if already exists
        if (votingManager.votes.some(v => v.id === vote.id)) {
            return false;
        }

        return true;
    }

    async broadcastRumor(rumor) {
        if (!this.isConnected || this.connections.size === 0) {
            console.log('P2P: No peers to broadcast to');
            return;
        }

        const message = {
            type: 'new_rumor',
            rumor: rumor,
            timestamp: Date.now()
        };

        this.broadcast(message);
    }

    async broadcastVote(vote) {
        if (!this.isConnected || this.connections.size === 0) {
            console.log('P2P: No peers to broadcast to');
            return;
        }

        const message = {
            type: 'new_vote',
            vote: vote,
            timestamp: Date.now()
        };

        this.broadcast(message);
    }

    broadcast(message) {
        this.connections.forEach((conn, peerId) => {
            try {
                conn.send(message);
                console.log('P2P: Broadcasted to', peerId);
            } catch (error) {
                console.error('P2P: Broadcast error to', peerId, error);
            }
        });
    }

    updateStatus(status, peerCount) {
        const statusEl = document.getElementById('p2pStatus');
        if (!statusEl) return;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');
        const count = statusEl.querySelector('.peer-count');

        // Update status
        statusEl.className = 'p2p-status';

        switch (status) {
            case 'connected':
                statusEl.classList.add('connected');
                text.textContent = 'Online';
                break;
            case 'disconnected':
                statusEl.classList.add('disconnected');
                text.textContent = 'Offline';
                break;
            case 'error':
                statusEl.classList.add('error');
                text.textContent = 'Error';
                break;
        }

        // Update peer count
        count.textContent = `${peerCount} peer${peerCount !== 1 ? 's' : ''}`;
    }

    destroy() {
        if (this.peer) {
            this.peer.destroy();
        }
        this.connections.clear();
    }
}

// Global P2P manager
const p2pManager = new P2PManager();
