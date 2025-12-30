import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // Добавим на всякий случай
  ],
  theme: {
    extend: {
      // Стандартные градиенты Next.js (можно оставить или убрать)
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      // --- НАШИ АНИМАЦИИ ДЛЯ ИГРЫ ---
      keyframes: {
        pan: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-10%)' }, // Движение влево-вправо
        }
      },
      animation: {
        'pan-camera': 'pan 10s ease-in-out infinite', // Медленное панорамирование
      }
    },
  },
  plugins: [],
};
export default config;