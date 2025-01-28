export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://www.bninewdelhi.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
