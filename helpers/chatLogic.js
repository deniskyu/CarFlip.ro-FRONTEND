export const DELETED_MESSAGE_TEXT = 'Acest mesaj a fost șters';

export const toTime = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const idOf = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') {
        if (value._id !== null && value._id !== undefined) return String(value._id);
        if (value.id !== null && value.id !== undefined) return String(value.id);
        return null;
    }
    const str = String(value);
    return str.length > 0 ? str : null;
};

export const sameId = (a, b) => {
    const left = idOf(a);
    const right = idOf(b);
    if (left === null || right === null) return false;
    return left === right;
};

export const senderIdOf = (message) => {
    if (!message) return null;
    return idOf(message.sender_id);
};

export const senderNameOf = (message) => {
    if (!message) return null;
    const sender = message.sender_id;
    if (sender && typeof sender === 'object' && typeof sender.username === 'string') {
        return sender.username;
    }
    return null;
};

export const isOwnMessage = (message, currentUserId, currentUsername) => {
    if (!message) return false;
    const senderId = senderIdOf(message);
    const myId = idOf(currentUserId);
    if (myId && senderId) return senderId === myId;
    const senderName = senderNameOf(message);
    if (currentUsername && senderName) return senderName === currentUsername;
    return false;
};

export const clientIdOf = (message) => {
    if (!message) return null;
    if (message.client_id === null || message.client_id === undefined) return null;
    const str = String(message.client_id);
    return str.length > 0 ? str : null;
};

export const sortMessagesDesc = (list) => {
    const arr = Array.isArray(list) ? list.slice() : [];
    arr.sort((a, b) => {
        const diff = toTime(b && b.createdAt) - toTime(a && a.createdAt);
        if (diff !== 0) return diff;
        const left = idOf(a) || '';
        const right = idOf(b) || '';
        if (left === right) return 0;
        return left < right ? 1 : -1;
    });
    return arr;
};

export const dedupeMessages = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const out = [];
    for (let i = 0; i < arr.length; i += 1) {
        const message = arr[i];
        const id = idOf(message);
        if (id === null) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(message);
    }
    return out;
};

export const normalizeMessages = (list) => sortMessagesDesc(dedupeMessages(list));

export const mergeOlderMessages = (prev, incoming) => {
    const base = Array.isArray(prev) ? prev : [];
    const extra = Array.isArray(incoming) ? incoming : [];
    if (extra.length === 0) return base;
    return normalizeMessages(base.concat(extra));
};

export const countNewMessages = (prev, incoming) => {
    const base = Array.isArray(prev) ? prev : [];
    const extra = Array.isArray(incoming) ? incoming : [];
    const existing = new Set();
    for (let i = 0; i < base.length; i += 1) {
        const id = idOf(base[i]);
        if (id !== null) existing.add(id);
    }
    let count = 0;
    for (let i = 0; i < extra.length; i += 1) {
        const id = idOf(extra[i]);
        if (id !== null && !existing.has(id)) {
            existing.add(id);
            count += 1;
        }
    }
    return count;
};

export const upsertMessage = (prev, incoming) => {
    const base = Array.isArray(prev) ? prev : [];
    if (!incoming) return base;
    const incomingId = idOf(incoming);
    if (incomingId === null) return base;
    const incomingClientId = clientIdOf(incoming);

    let replaced = false;
    const next = [];
    for (let i = 0; i < base.length; i += 1) {
        const current = base[i];
        const currentId = idOf(current);
        const currentClientId = clientIdOf(current);
        const matchesById = currentId !== null && currentId === incomingId;
        const matchesByClientId = incomingClientId !== null && (
            (currentClientId !== null && currentClientId === incomingClientId) ||
            (currentId !== null && currentId === incomingClientId)
        );

        if ((matchesById || matchesByClientId) && !replaced) {
            replaced = true;
            const merged = Object.assign({}, current, incoming);
            merged.pending = false;
            merged.failed = false;
            next.push(merged);
            continue;
        }

        if (matchesById || matchesByClientId) continue;
        next.push(current);
    }

    if (!replaced) next.push(incoming);
    return normalizeMessages(next);
};

export const removeMessage = (prev, messageId) => {
    const base = Array.isArray(prev) ? prev : [];
    const target = idOf(messageId);
    if (target === null) return base;
    return base.filter((message) => {
        const id = idOf(message);
        const clientId = clientIdOf(message);
        return id !== target && clientId !== target;
    });
};

export const patchMessage = (prev, messageId, patch) => {
    const base = Array.isArray(prev) ? prev : [];
    const target = idOf(messageId);
    if (target === null) return base;
    let changed = false;
    const next = base.map((message) => {
        const id = idOf(message);
        const clientId = clientIdOf(message);
        if (id !== target && clientId !== target) return message;
        changed = true;
        return Object.assign({}, message, patch);
    });
    return changed ? next : base;
};

export const markMessageDeleted = (prev, messageId) => patchMessage(prev, messageId, {
    type: 'text',
    text: DELETED_MESSAGE_TEXT,
    image_url: null,
    image_public_id: null,
    sale_preview: null,
    is_deleted: true,
    pending: false,
    failed: false,
});

export const markOwnMessagesRead = (prev, currentUserId, currentUsername) => {
    const base = Array.isArray(prev) ? prev : [];
    let changed = false;
    const next = base.map((message) => {
        if (!message || message.is_read) return message;
        if (!isOwnMessage(message, currentUserId, currentUsername)) return message;
        changed = true;
        return Object.assign({}, message, { is_read: true });
    });
    return changed ? next : base;
};

export const shouldShowTime = (list, index, gapMs) => {
    const arr = Array.isArray(list) ? list : [];
    const gap = Number.isFinite(gapMs) ? gapMs : 5 * 60 * 1000;
    if (index < 0 || index >= arr.length) return false;
    if (index === 0) return true;
    const current = arr[index];
    const newer = arr[index - 1];
    if (!current || !newer) return true;
    return Math.abs(toTime(newer.createdAt) - toTime(current.createdAt)) > gap;
};

export const oldestMessageId = (list) => {
    const arr = Array.isArray(list) ? list : [];
    let oldest = null;
    let oldestTime = Infinity;
    for (let i = 0; i < arr.length; i += 1) {
        const message = arr[i];
        if (!message || message.pending) continue;
        const id = idOf(message);
        if (id === null) continue;
        const time = toTime(message.createdAt);
        if (time <= oldestTime) {
            oldestTime = time;
            oldest = id;
        }
    }
    return oldest;
};

export const sortConversationsDesc = (list) => {
    const arr = Array.isArray(list) ? list.slice() : [];
    arr.sort((a, b) => {
        const diff = toTime(b && b.last_message_at) - toTime(a && a.last_message_at);
        if (diff !== 0) return diff;
        const left = idOf(a) || '';
        const right = idOf(b) || '';
        if (left === right) return 0;
        return left < right ? 1 : -1;
    });
    return arr;
};

export const applyConversationUpdate = (list, data, options) => {
    const base = Array.isArray(list) ? list : [];
    const config = options || {};
    const conversationId = data ? idOf(data.conversationId) : null;
    if (conversationId === null) return { list: base, missing: false, delta: 0 };

    const index = base.findIndex((conversation) => idOf(conversation) === conversationId);
    if (index === -1) return { list: base, missing: true, delta: 0 };

    const fromSelf = config.currentUserId && data.senderId
        ? sameId(data.senderId, config.currentUserId)
        : false;
    const isActive = config.activeConversationId
        ? idOf(config.activeConversationId) === conversationId
        : false;

    const requested = Number.isFinite(data.unreadIncrement) ? data.unreadIncrement : 1;
    const increment = (data.silent === true || fromSelf || isActive) ? 0 : requested;

    const current = base[index];
    const updated = Object.assign({}, current, {
        last_message: data.last_message !== undefined ? data.last_message : current.last_message,
        last_message_type: data.last_message_type !== undefined ? data.last_message_type : current.last_message_type,
        last_message_at: data.last_message_at !== undefined && data.last_message_at !== null
            ? data.last_message_at
            : current.last_message_at,
        unread_count: Math.max(0, (Number(current.unread_count) || 0) + increment),
    });

    const next = base.slice();
    next[index] = updated;
    return { list: sortConversationsDesc(next), missing: false, delta: increment };
};

export const clearConversationUnread = (list, conversationId) => {
    const base = Array.isArray(list) ? list : [];
    const target = idOf(conversationId);
    if (target === null) return { list: base, cleared: 0 };
    let cleared = 0;
    const next = base.map((conversation) => {
        if (idOf(conversation) !== target) return conversation;
        const count = Number(conversation.unread_count) || 0;
        if (count === 0) return conversation;
        cleared = count;
        return Object.assign({}, conversation, { unread_count: 0 });
    });
    return { list: cleared > 0 ? next : base, cleared };
};

export const clampUnread = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
};
