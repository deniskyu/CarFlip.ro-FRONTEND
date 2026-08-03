const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const base64UrlToBinary = (input) => {
    let str = String(input).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (let i = 0; i < str.length; i += 1) {
        const char = str.charAt(i);
        if (char === '=') break;
        const index = B64_ALPHABET.indexOf(char);
        if (index === -1) continue;
        buffer = (buffer << 6) | index;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >> bits) & 0xFF);
        }
    }

    return output;
};

const binaryToUtf8 = (binary) => {
    try {
        let escaped = '';
        for (let i = 0; i < binary.length; i += 1) {
            const code = binary.charCodeAt(i);
            escaped += `%${`00${code.toString(16)}`.slice(-2)}`;
        }
        return decodeURIComponent(escaped);
    } catch (e) {
        return binary;
    }
};

export const decodeJwtPayload = (token) => {
    try {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const binary = base64UrlToBinary(parts[1]);
        if (!binary) return null;
        const json = binaryToUtf8(binary);
        const payload = JSON.parse(json);
        if (!payload || typeof payload !== 'object') return null;
        return payload;
    } catch (e) {
        return null;
    }
};

export const extractUserIdFromToken = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const candidates = [payload.id, payload._id, payload.userId, payload.user_id, payload.sub];
    for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (candidate === null || candidate === undefined) continue;
        const value = String(candidate);
        if (value.length > 0) return value;
    }
    return null;
};

export const isTokenExpired = (token, skewSeconds) => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    const skew = Number.isFinite(skewSeconds) ? skewSeconds : 10;
    return (payload.exp * 1000) <= (Date.now() + skew * 1000);
};
