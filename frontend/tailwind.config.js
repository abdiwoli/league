/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#0ea5e9', // Sky blue
                    600: '#0284c7',
                    900: '#0c4a6e',
                },
                background: '#0f172a', // Slate 900
                surface: '#1e293b', // Slate 800
                accent: '#10b981', // Emerald
                danger: '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
