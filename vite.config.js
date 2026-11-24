import { defineConfig } from 'vite';

const securityHeadersMeta = {
  name: 'inject-production-security-meta',
  apply: 'build',
  transformIndexHtml() {
    return [
      {
        tag: 'meta',
        attrs: { name: 'referrer', content: 'no-referrer' },
        injectTo: 'head'
      },
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content:
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none';"
        },
        injectTo: 'head'
      }
    ];
  }
};

export default defineConfig({
  base: './',
  plugins: [securityHeadersMeta]
});
