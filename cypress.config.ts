import { defineConfig } from 'cypress';
import { BuildOptions, context } from 'esbuild';
import { createCustomDevServer } from './src/index';
import path from 'path';
import { copy } from 'esbuild-plugin-copy';

const outdir = './dist-test';

export default defineConfig({
  component: {
    specPattern: './cypress/component/*.cy.tsx',
    devServer: createCustomDevServer(
      async ({
        onBuildComplete,
        onBuildStart,
        specs,
        supportFile,
        serveStatic,
      }) => {
        const createEsbuildConfig = (specs): BuildOptions => ({
          outdir,
          entryPoints: [
            ...specs.map((spec) => spec.absolute),
            supportFile && supportFile.absolute,
          ],
          outbase: './',
          allowOverwrite: true,
          format: 'esm',
          bundle: true,
          target: 'chrome90',
          splitting: true,
          sourcemap: true,
          plugins: [
            {
              name: 'watch',
              setup(build) {
                build.onStart(onBuildStart);
                build.onEnd(onBuildComplete);
              },
            },
            copy({
              assets: [
                {
                  from: ['./data/**/*'],
                  to: ['./data'],
                },
              ],
            }),
          ],
        });
        serveStatic('./dist-test');
        let ctx = await context(createEsbuildConfig(specs));
        ctx.watch();

        return {
          loadTest: async (spec, { loadBundle, injectHTML }) => {
            const testPath = spec.relative.replace(spec?.fileExtension, '.js')
            if (supportFile) {
              const supportPath =
                supportFile?.relative.replace(
                  supportFile.fileExtension,
                  '.js'
                )
              loadBundle(supportPath);
            }

            loadBundle(testPath);
            injectHTML('<div data-test="injection-body"></div>', 'body');
            injectHTML('<meta data-test="injection-head"></div>');
          },
          onSpecChange: async (newSpecs) => {
            await ctx.dispose();
            ctx = await context(createEsbuildConfig(newSpecs));
            ctx.watch();
          },
          devServerPort: 0,
          onClose: () => ctx.dispose(),
          logFunction: (logLevel, ...messages) => console.log('[TESTSERVER]', logLevel, ...messages)
        };
      }
    ),
  },

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
