/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 학생 화면 (어두운 밤하늘)
        night: {
          bg: '#0B1026',
          card: '#151B3A',
          line: '#222A55',
          text: '#EEF0FF',
          sub: '#A9B0D6',
          star: '#F4C979',
        },
        // 감정 사분면
        emo: {
          hot: '#FF8E72', // 불쾌·높은 에너지
          joy: '#F4C979', // 유쾌·높은 에너지
          low: '#9FA8FF', // 불쾌·낮은 에너지
          calm: '#7FD6C2', // 편안함
        },
        // 상담사 화면 (별숨 관측소, 밝은 테마)
        obs: {
          bg: '#F5F6FB',
          card: '#FFFFFF',
          text: '#141A3A',
          sub: '#5A6185',
          accent: '#3B45A8',
          line: '#DDE1EE',
        },
      },
      fontFamily: {
        display: ['"Gowun Batang"', 'serif'],
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
