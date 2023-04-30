import { defineConfig } from 'cypress'
import {BuildOptions, context} from 'esbuild'
import { createCustomDevServer } from './src/index'
import path from 'path';

const outdir = './dist-test'

export default defineConfig({
  component: {
    specPattern: './cypress/component/*.cy.tsx',
    devServer: createCustomDevServer(async ({ onBuildComplete, onBuildStart, specs, supportFile, serveStatic }) => {
      const createEsbuildConfig = (specs): BuildOptions => ({
        outdir,
          entryPoints: [...specs.map((spec) => spec.absolute), supportFile && supportFile.absolute],
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
                      build.onStart(onBuildStart)
                      build.onEnd(onBuildComplete)
                  }
              }
          ]
      })
      serveStatic('./dist-test')
      let ctx = await context(createEsbuildConfig(specs))
      ctx.watch()

      return {
          loadTest: async (spec, { loadBundle, injectHTML }) => {
              const testPath = path.resolve(path.join(outdir, spec.relative.replace(spec?.fileExtension, '.js')))
              if (supportFile) {
                const supportPath = path.resolve(path.join(outdir, supportFile?.relative.replace(supportFile.fileExtension, '.js')))
                loadBundle(supportPath)
              }

              loadBundle(testPath)
              injectHTML('<div data-test="injection-body"></div>', 'body')
              injectHTML('<div data-test="injection-head"></div>')
          },
          onSpecChange: async (newSpecs) => {
              await ctx.dispose()
              ctx = await context(createEsbuildConfig(newSpecs))
              ctx.watch()
          },
          devServerPort: 0,
          onClose: () => ctx.dispose()
      }
  }),
  },
});
