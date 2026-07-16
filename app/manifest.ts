import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Intellistreet — Smart City Civic Platform',
    short_name: 'Intellistreet',
    description: 'An AI-powered civic platform allowing citizens to identify, report, verify, track, and resolve community issues collaboratively.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
