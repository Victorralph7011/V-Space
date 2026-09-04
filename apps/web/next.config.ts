import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
  images: {
    remotePatterns: [
      // Firebase Storage download URLs — item media and user avatars.
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      // Google account photos, from Google sign-in.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      // Link-preview thumbnails fetched by /api/unfurl — any https host, since
      // the whole point of unfurling is that the source is unpredictable.
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
