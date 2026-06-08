import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

export const Text = forwardRef((props, ref) => (
    <RNText ref={ref} allowFontScaling={true} maxFontSizeMultiplier={1.05} {...props} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef((props, ref) => (
    <RNTextInput ref={ref} allowFontScaling={true} maxFontSizeMultiplier={1.05} {...props} />
));
TextInput.displayName = 'TextInput';