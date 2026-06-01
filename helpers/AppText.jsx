import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

export const Text = forwardRef((props, ref) => (
    <RNText ref={ref} allowFontScaling={false} maxFontSizeMultiplier={1} {...props} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef((props, ref) => (
    <RNTextInput ref={ref} allowFontScaling={false} maxFontSizeMultiplier={1} {...props} />
));
TextInput.displayName = 'TextInput';