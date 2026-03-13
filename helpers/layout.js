import { Dimensions, PixelRatio, Platform } from 'react-native';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 90;
export const ITEM_HEIGHT = PixelRatio.roundToNearestPixel(height - TAB_BAR_HEIGHT);