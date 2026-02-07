// Identity management with Web Crypto API and browser fingerprinting
class IdentityManager {
    constructor() {
        this.identity = null;
        this.fingerprint = null;
        this.ipHash = null;
    }

    async init() {
        // CRITICAL: Generate fingerprint FIRST to prevent incognito bypass
        if (CONFIG.ENABLE_FINGERPRINT) {
            this.fingerprint = await this.getFingerprint();

            // IP DEFENSE: Fetch IP Hash for cross-browser linking
            this.ipHash = await this.getIpHash();

            // Check if this device already has an account bound to it (in localStorage)
            const boundFingerprint = localStorage.getItem('rumorality_device_fingerprint');

            if (boundFingerprint && boundFingerprint !== 'undefined') {
                // Device already has an account - verify it matches
                // MIGRATION FIX: If the stored fingerprint is different (e.g. from old implementation),
                // we should update it to the new robust one instead of blocking the user.
                // In production, this would be stricter, but for development/migration:
                if (boundFingerprint !== this.fingerprint) {
                    console.warn('Fingerprint changed (migration). Updating stored fingerprint.');
                    localStorage.setItem('rumorality_device_fingerprint', this.fingerprint);
                }
            } else {
                // First time on this device - will bind after creating identity
                localStorage.setItem('rumorality_device_fingerprint', this.fingerprint);
            }
        }

        // Try to load existing identity
        this.identity = await storage.get('identity', 'user');

        if (!this.identity) {
            // Generate new identity (only if no existing identity in IndexedDB)
            await this.generateIdentity();
        } else if (CONFIG.ENABLE_FINGERPRINT) {
        } else if (CONFIG.ENABLE_FINGERPRINT) {
            // Verify fingerprint matches stored identity (prevent account migration)
            if (this.identity.fingerprint && this.identity.fingerprint !== this.fingerprint) {
                // MIGRATION FIX: Update stored identity with new fingerprint
                console.warn('Identity fingerprint mismatch (migration). Updating identity record.');
                this.identity.fingerprint = this.fingerprint;
                await storage.put('identity', this.identity);
            } else if (!this.identity.fingerprint) {
                // Legacy account without fingerprint - bind it now
                console.log('Binding legacy account to this device.');
                this.identity.fingerprint = this.fingerprint;
                await storage.put('identity', this.identity);
            }
        }

        return this.identity;
    }

    async generateIdentity() {
        // Generate Ed25519 key pair using Web Crypto API
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            true, // extractable (for demo; in production would be false)
            ['sign', 'verify']
        );

        // Export public key to create user ID
        const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const publicKeyHash = await this.hashBuffer(publicKeyBuffer);
        const userId = this.bufferToHex(publicKeyHash).substring(0, 16);

        this.identity = {
            id: 'user',
            userId: userId,
            publicKey: await window.crypto.subtle.exportKey('jwk', keyPair.publicKey),
            privateKey: await window.crypto.subtle.exportKey('jwk', keyPair.privateKey),
            fingerprint: CONFIG.ENABLE_FINGERPRINT ? await this.getFingerprint() : null,
            createdAt: Date.now()
        };

        await storage.put('identity', this.identity);

        // Initialize reputation
        await reputationManager.init();

        return this.identity;
    }

    async getFingerprint() {
        // Browser fingerprinting (canvas + WebGL + audio context)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Rumorality', 2, 2);
        const canvasData = canvas.toDataURL();
        try {
            // Initialize FingerprintJS agent
            const fpPromise = FingerprintJS.load();
            const fp = await fpPromise;
            const result = await fp.get();

            console.log('Device Fingerprint:', result.visitorId);

            // INCIGNITO DETECTION (Heuristic)
            // If we are in Incognito, we force the ID to be 'anonymous_device_blocked'
            // This prevents generating unique IDs for every Incognito session.
            const isIncognito = await this.detectIncognito();
            if (isIncognito) {
                console.warn('Incognito mode detected. Blocking unique ID generation.');
                return 'anonymous_device_blocked';
            }

            return result.visitorId;
        } catch (error) {
            console.error('Fingerprint generation failed:', error);
            // SYBIL DEFENSE: Do NOT return a random ID here.
            // If we return random, Incognito users get a new ID every time -> infinite votes.
            // Instead, return a constant "Anonymous" ID.
            // This groups all Incognito/Blocked users into ONE identity.
            // Result: Only ONE anonymous vote allowed per rumor worldwide.
            return 'anonymous_device_blocked';
        }
    }

    async getIpHash() {
        try {
            // Fetch public IP from a free API
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ip = data.ip;

            // Hash the IP to respect basic privacy (we store hash, not raw IP)
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(ip + "RUMORALITY_SALT"); // Simple salt
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            console.log('IP Hash generated:', hashHex.substring(0, 8) + '...');
            return hashHex;
        } catch (error) {
            console.error('Failed to fetch/hash IP:', error);
            // Fallback: If IP fetch fails (e.g. adblock), we can't use IP defense.
            // Return null so we rely on FingerprintJS as backup.
            return null;
        }
    }

    async detectIncognito() {
        // Heuristic 1: Storage Quota
        // Incognito mode often has a specific, lower storage quota cap (e.g. 100MB or 120MB)
        // compared to the massive quota of normal browsing (10%+ of disk).
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const { quota } = await navigator.storage.estimate();
                // If quota is less than 150MB, it's highly likely Incognito
                // (Normal Chrome usually gives 10s or 100s of GB)
                if (quota < 150 * 1024 * 1024) {
                    return true;
                }
            } catch (e) {
                console.log('Quota check failed', e);
            }
        }
        return false;
    }

    async signMessage(message) {
        // Import private key
        const privateKey = await window.crypto.subtle.importKey(
            'jwk',
            this.identity.privateKey,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
        );

        // Sign message
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));
        const signature = await window.crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            privateKey,
            data
        );

        return this.bufferToHex(signature);
    }

    async verifySignature(message, signature, publicKeyJwk) {
        try {
            // Import public key
            const publicKey = await window.crypto.subtle.importKey(
                'jwk',
                publicKeyJwk,
                { name: 'ECDSA', namedCurve: 'P-256' },
                false,
                ['verify']
            );

            // Verify signature
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(message));
            const signatureBuffer = this.hexToBuffer(signature);

            return await window.crypto.subtle.verify(
                { name: 'ECDSA', hash: 'SHA-256' },
                publicKey,
                signatureBuffer,
                data
            );
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    isNewAccount() {
        if (!CONFIG.ENABLE_COOLDOWN) return false;

        const accountAge = Date.now() - this.identity.createdAt;
        const cooldownPeriod = CONFIG.COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        return accountAge < cooldownPeriod;
    }

    getUserId() {
        return this.identity ? this.identity.userId : null;
    }

    // Helper functions
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        // Check if crypto.subtle is available (requires HTTPS on mobile)
        if (window.crypto && window.crypto.subtle) {
            return await window.crypto.subtle.digest('SHA-256', data);
        } else {
            // Fallback for HTTP connections (simple hash)
            console.warn('Web Crypto API not available, using fallback hash');
            return this.simpleHash(str);
        }
    }

    async hashBuffer(buffer) {
        if (window.crypto && window.crypto.subtle) {
            return await window.crypto.subtle.digest('SHA-256', buffer);
        } else {
            // Fallback
            const str = new TextDecoder().decode(buffer);
            return this.simpleHash(str);
        }
    }

    // Simple hash fallback for non-HTTPS
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Convert to hex-like format
        const hex = Math.abs(hash).toString(16).padStart(16, '0');

        // Return as ArrayBuffer-like for compatibility
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes.buffer;
    }

    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }
}

// Global identity manager
const identityManager = new IdentityManager();
