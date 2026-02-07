// Lightweight peer registry for WebRTC signaling
// This server ONLY helps peers find each other - it doesn't control truth or store data

const peers = new Map(); // peerId -> { timestamp, lastSeen }
const PEER_TIMEOUT = 60000; // 60 seconds

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Clean up stale peers
    const now = Date.now();
    for (const [peerId, data] of peers.entries()) {
        if (now - data.lastSeen > PEER_TIMEOUT) {
            peers.delete(peerId);
        }
    }

    if (req.method === 'POST') {
        // Register a peer
        const { peerId } = req.body;

        if (!peerId || !peerId.startsWith('rumorality-')) {
            res.status(400).json({ error: 'Invalid peer ID' });
            return;
        }

        peers.set(peerId, {
            timestamp: now,
            lastSeen: now
        });

        res.status(200).json({
            success: true,
            activePeers: peers.size
        });

    } else if (req.method === 'GET') {
        // Get list of active peers
        const activePeers = Array.from(peers.keys());

        res.status(200).json({
            peers: activePeers,
            count: activePeers.length
        });

    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
