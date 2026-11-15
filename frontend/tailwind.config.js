/** Design tokens for ProductFlow: forest green, sage, warm off-white, charcoal sidebar, amber for warnings only. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F6F2', card: '#FFFFFF', card2: '#FBFAF7', hov: '#F0EFE8',
        ink: '#292D29', ink2: '#747970', mute: '#9A9E94', line: '#E5E4DC',
        brand: '#355E3B', brandh: '#2A4A2F', brands: '#EDF1E9',
        sage: '#82977A', sagedk: '#5E7356', amber: '#C28B35', ok: '#63856A', side: '#242923',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
