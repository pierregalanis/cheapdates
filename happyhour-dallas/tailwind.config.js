/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF6B1A',
          amber: '#FFB347',
          gold: '#E8A830',
          dark: '#1A0A00',
          card: '#2A1500',
          surface: '#221000',
          cream: '#FFF8F0',
          muted: '#8A6A50',
        },
      },
      fontFamily: {
        playfair: ['PlayfairDisplay_900Black'],
        'dm-regular': ['DMSans_400Regular'],
        'dm-medium': ['DMSans_500Medium'],
      },
    },
  },
};
