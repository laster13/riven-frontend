import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
        server: {
          port: 3000, // Changez 3000 par le port que vous souhaitez utiliser
        },
	define: {
		SUPERFORMS_LEGACY: true
	}
});
