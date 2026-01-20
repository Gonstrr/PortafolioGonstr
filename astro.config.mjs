import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind()],
	output: 'server',
	adapter: vercel({
		webAnalytics: {
			enabled: true
		}
	}),
	legacy: {
		collections: true
	},
	security: {
		checkOrigin: true
	},
	vite: {
		define: {
			__SECURE__: true,
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__VERSION__: JSON.stringify("1.0.0-LogsGonstr")
		}
	}
});
