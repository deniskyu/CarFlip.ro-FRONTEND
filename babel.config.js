module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv'],
    ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ['react-native-reanimated/plugin']
  ]
};
