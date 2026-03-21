import { Dimensions, PixelRatio, Platform } from 'react-native';

const { height } = Dimensions.get('window');

export const TAB_BAR_HEIGHT = Platform.OS === 'ios'
    ? 80
    : height < 780 ? 56 : 90

export const Layout = {
    ITEM_HEIGHT: PixelRatio.roundToNearestPixel(height - TAB_BAR_HEIGHT),
    calibrated: false,
};

export function calibrateItemHeight(containerHeight) {
    Layout.ITEM_HEIGHT = PixelRatio.roundToNearestPixel(containerHeight);
    Layout.calibrated = true;
}

export const ITEM_HEIGHT = Layout.ITEM_HEIGHT;

export const UI_SCALE = Platform.OS === 'ios' ? 1 : Math.min(1, height / 850);

export const SUMMARY_SCALE = Platform.OS === 'ios'
    ? 1
    : Math.min(1, Math.max(0.75, 0.75 + (height - 720) * (0.4 / 130)));