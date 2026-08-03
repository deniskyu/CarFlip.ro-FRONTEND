import { Dimensions, PixelRatio, Platform } from 'react-native';

const BASE_WIDTH = 390;

const readDimensions = () => {
    const candidates = [];
    try {
        const win = Dimensions.get('window');
        if (win) candidates.push(win.width, win.height);
    } catch (e) {}
    try {
        const scr = Dimensions.get('screen');
        if (scr) candidates.push(scr.width, scr.height);
    } catch (e) {}
    const valid = candidates.filter((n) => typeof n === 'number' && isFinite(n) && n > 0);
    if (valid.length === 0) return { shortSide: BASE_WIDTH, longSide: 844 };
    return { shortSide: Math.min.apply(null, valid), longSide: Math.max.apply(null, valid) };
};

const { shortSide, longSide } = readDimensions();

export const SHORT_SIDE = Math.min(Math.max(shortSide, 240), 2048);
export const LONG_SIDE = Math.min(Math.max(longSide, SHORT_SIDE), 4096);
export const IS_TABLET = SHORT_SIDE >= 600;

const readFontScale = () => {
    try {
        const value = PixelRatio.getFontScale();
        if (typeof value === 'number' && isFinite(value) && value > 0) return value;
    } catch (e) {}
    return 1;
};

export const FONT_SCALE = Math.min(2, Math.max(0.8, readFontScale()));

const RAW = SHORT_SIDE / BASE_WIDTH;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const SPACE_SCALE = clamp(RAW, 0.82, IS_TABLET ? 1.18 : 1.06);
export const FONT_MULTIPLIER = clamp(RAW, 0.9, IS_TABLET ? 1.1 : 1.05);

const VERTICAL_COMPENSATION = FONT_SCALE > 1
    ? clamp(1 / FONT_SCALE, 0.74, 1)
    : 1;

const round = (value) => {
    try {
        const result = PixelRatio.roundToNearestPixel(value);
        if (typeof result === 'number' && isFinite(result)) return result;
    } catch (e) {}
    return Math.round(value);
};

export const s = (value) => {
    const num = Number(value) || 0;
    return round(num * SPACE_SCALE);
};

export const vs = (value) => {
    const num = Number(value) || 0;
    return round(num * SPACE_SCALE * VERTICAL_COMPENSATION);
};

export const f = (value) => {
    const num = Number(value) || 0;
    if (num <= 0) return 0;
    const scaled = num * FONT_MULTIPLIER;
    const floor = Math.min(Math.max(11, num - 2), num);
    const ceiling = num + 3;
    return round(clamp(scaled, floor, ceiling));
};

export const line = (fontSize, ratio) => {
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.38;
    return round(fontSize * safeRatio);
};

export const textBlock = (fontSize, ratio) => {
    const size = f(fontSize);
    const base = { fontSize: size, lineHeight: line(size, ratio) };
    if (Platform.OS === 'android') {
        base.includeFontPadding = false;
    }
    return base;
};

export const metaText = (fontSize, ratio) => textBlock(fontSize, ratio || 1.3);

export const CONTENT_MAX_WIDTH = IS_TABLET ? 760 : null;

export const BUBBLE_MAX_WIDTH = IS_TABLET
    ? Math.min(round(SHORT_SIDE * 0.62), 520)
    : '78%';

export const CHAT_IMAGE_SIZE = clamp(round(SHORT_SIDE * 0.52), 150, 300);

export const AVATAR_LIST = clamp(s(52), 42, 64);
export const AVATAR_MESSAGE = clamp(s(28), 24, 36);
export const AVATAR_HEADER = clamp(s(38), 32, 48);

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export const LIST_ROW_HEIGHT = AVATAR_LIST + vs(24) + 1;

export default {
    s,
    vs,
    f,
    line,
    textBlock,
    metaText,
    IS_TABLET,
    SHORT_SIDE,
    LONG_SIDE,
    FONT_SCALE,
    SPACE_SCALE,
    FONT_MULTIPLIER,
    CONTENT_MAX_WIDTH,
    BUBBLE_MAX_WIDTH,
    CHAT_IMAGE_SIZE,
    AVATAR_LIST,
    AVATAR_MESSAGE,
    AVATAR_HEADER,
    HIT_SLOP,
    LIST_ROW_HEIGHT,
};
