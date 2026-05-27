// PostCSS pipeline used by Next.js to process Tailwind and vendor prefixes.
const config = {
  plugins: {
    // Expands Tailwind utility classes into real CSS.
    tailwindcss: {},
    // Adds browser-specific CSS prefixes when needed.
    autoprefixer: {}
  }
};

export default config;
