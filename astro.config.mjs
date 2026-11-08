// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // We use no Astro sessions or image transforms, so skip the KV and Images bindings.
  session: false,
  adapter: cloudflare({ imageService: 'passthrough' }),
});
