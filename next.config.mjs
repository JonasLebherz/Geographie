/**
 * next.config.mjs – Einstellungen für Next.js
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kein "X-Powered-By: Next.js"-Header nach außen
  poweredByHeader: false,

  // Der frühere Modus „Länder eines Kontinents“ ist in der Karten-Erkundung aufgegangen
  async redirects() {
    return [
      { source: '/kontinente', destination: '/karte', permanent: true },
      { source: '/kontinente/:kontinent', destination: '/karte/:kontinent?quiz=laender', permanent: true },
      // Das Umriss-Quiz gibt es nicht mehr
      { source: '/quiz/:pfad*', destination: '/', permanent: true },
      { source: '/karte', destination: '/', permanent: false },
    ];
  },

  // Zusätzliche Sicherheits-Header für alle Seiten
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
