// Identity management with Web Crypto API and browser fingerprinting
class IdentityManager {
    constructor() {
        this.identity = null;
        this.fingerprint = null;
    }

    async init() {
        // CRITICAL: Generate fingerprint FIRST to prevent incognito bypass
        if (CONFIG.ENABLE_FINGERPRINT) {
            this.fingerprint = await this.getFingerprint();

            // Check if this device already has an account bound to it (in localStorage)
            const boundFingerprint = localStorage.getItem('rumorality_device_fingerprint');

            if (boundFingerprint) {
                // Device already has an account - verify it matches
                if (boundFingerprint !== this.fingerprint) {
                    throw new Error('Device fingerprint mismatch! This should never happen.');
                }
                // Fingerprint matches - this is the same device, load existing account
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
            // Verify fingerprint matches stored identity (prevent account migration)
            if (this.identity.fingerprint && this.identity.fingerprint !== this.fingerprint) {
                throw new Error('Device mismatch! This account is bound to another device.');
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

        // Combine with other browser properties
        const fingerprint = {
            canvas: canvasData,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const fingerprintString = JSON.stringify(fingerprint);
        const hash = await this.hashString(fingerprintString);
        return this.bufferToHex(hash);
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
