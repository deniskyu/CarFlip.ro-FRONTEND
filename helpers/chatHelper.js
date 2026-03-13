import axiosAuthGuard from './axiosAuthGuard.js';

export const uploadChatImage = async (imageFile, conversationId) => {
    const formData = new FormData();
    formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type,
        name: imageFile.name,
    });
    formData.append('conversationId', conversationId);

    const res = await axiosAuthGuard.post('/api/chat/send-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
    });

    if (!res.data.success) {
        throw new Error(res.data.message || 'Upload eșuat.');
    }

    return res.data.data;
};

export const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (isToday) return timeStr;
    if (isYesterday) return `Ieri ${timeStr}`;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month} ${timeStr}`;
};

export const formatConversationTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    if (isYesterday) return 'Ieri';

    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        const days = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
        return days[date.getDay()];
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
};