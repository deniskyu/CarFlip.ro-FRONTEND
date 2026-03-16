module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv'],
    ['react-native-reanimated/plugin'],
    ['transform-remove-console', { exclude: ['error', 'warn'] }]
  ]
};
