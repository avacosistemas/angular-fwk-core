const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--fwk-primary)',
                    50: 'rgb(239 246 255)',
                    100: 'rgb(219 234 254)',
                    200: 'rgb(191 219 254)',
                    300: 'rgb(147 197 253)',
                    400: 'rgb(96 165 250)',
                    500: 'rgb(59 130 246)',
                    600: 'rgb(37 99 235)',
                    700: 'rgb(29 78 216)',
                    800: 'rgb(30 64 175)',
                    900: 'rgb(30 58 138)',
                },
                'on-primary': {
                    DEFAULT: '#ffffff',
                },
                accent: {
                    DEFAULT: 'var(--fwk-accent)',
                    50: 'rgb(239 246 255)',
                    100: 'rgb(219 234 254)',
                    200: 'rgb(191 219 254)',
                    300: 'rgb(147 197 253)',
                    400: 'rgb(96 165 250)',
                    500: 'rgb(59 130 246)',
                    600: 'rgb(37 99 235)',
                    700: 'rgb(29 78 216)',
                    800: 'rgb(30 64 175)',
                    900: 'rgb(30 58 138)',
                },
                'on-accent': {
                    DEFAULT: '#ffffff',
                },
                warn: {
                    DEFAULT: 'var(--fwk-warn)',
                    50: 'rgb(254 242 242)',
                    100: 'rgb(254 226 226)',
                    200: 'rgb(254 202 202)',
                    300: 'rgb(252 165 165)',
                    400: 'rgb(248 113 113)',
                    500: 'rgb(239 68 68)',
                    600: 'rgb(220 38 38)',
                    700: 'rgb(185 28 28)',
                    800: 'rgb(153 27 27)',
                    900: 'rgb(127 29 29)',
                },
                'on-warn': {
                    DEFAULT: '#ffffff',
                },
            },
            fontFamily: {
                sans: ['"Inter var"', ...defaultTheme.fontFamily.sans],
                mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
            },
        },
        iconSize: {
            3  : '0.75rem',
            3.5: '0.875rem',
            4  : '1rem',
            4.5: '1.125rem',
            5  : '1.25rem',
            6  : '1.5rem',
            7  : '1.75rem',
            8  : '2rem',
            10 : '2.5rem',
            12 : '3rem',
            14 : '3.5rem',
            16 : '4rem',
            18 : '4.5rem',
            20 : '5rem',
            22 : '5.5rem',
            24 : '6rem',
        },
    },
    plugins: [
        require('./tailwind/plugins/icon-size'),
        require('./tailwind/plugins/utilities'),
        plugin(({ addUtilities }) => {
            addUtilities({
                '.text-opacity-12': { '--tw-text-opacity': '0.12' },
                '.text-opacity-38': { '--tw-text-opacity': '0.38' },
                '.text-opacity-60': { '--tw-text-opacity': '0.60' },
            });
        }),
    ],
};
