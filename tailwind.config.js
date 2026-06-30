module.exports = {
  presets: [require('./packages/core/tailwind-preset')],
  content: [
    './packages/core/src/**/*.{html,ts,scss}',
  ],
  darkMode: 'class',
  important: true,
};
