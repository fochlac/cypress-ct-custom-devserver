[![CircleCI](https://dl.circleci.com/status-badge/img/gh/fochlac/cypress-ct-custom-devserver/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/fochlac/cypress-ct-custom-devserver/tree/main) [![npm](https://img.shields.io/npm/v/cypress-ct-custom-devserver)](https://www.npmjs.com/package/cypress-ct-custom-devserver)

# cypress-ct-custom-devserver
A helper for setting up Cypress devServers for component testing.

## Description

This library offers a framework to abstract some of the difficulties regarding setting up a custom Cypress dev-server for component testing. Namely this library will setup an express server for delivering your bundled code and provide you with a clean api for setting up your build tools. 
You will have to take care of setting up the build process for the provided entry points and map the tests to their respective bundles.

## Installation
Add the library to your devDependencies
```bash
npm install -D cypress-ct-custom-devserver
```

## Example Configuration
In your cypress config or in a seperate file setup the devServer as follows:

```js
const devServer = createCustomDevServer(async ({ onBuildComplete, onBuildStart, specs, supportFile, serveStatic }) => {
    // first you need to start your prefered build tool in watch mode
    let onClose = await startBuildInWatchMode({
        entryPoints: [...specs.map((spec) => spec.absolute), supportFile && supportFile.absolute],
        onBuildComplete, // this needs to be called whenever the build is complete so cypress can restart the test.
        onBuildStart // if this callback is provided the api will wait until the build is finished before it serves the bundles.
    })

    // if you use code splitting or want to reference assets, you should setup
    // static serving for your output folder and any other folder you want accessible from the test
    serveStatic('./output-folder')
    // you can also specify a custom path prefix
    serveStatic('./images', '/custom/image')

    return {
        // This callback is triggered when Cypress requests the bundle for a test.
        // The spec-parameter contains information about which test the bundle is requested for.
        // You can use the loadBundle function to import js files. The sequence of imports will be preserved.
        // You can also inject html into the head or body using the injectHTML function. This can be used to inject i.e. styles.
        loadTest: async (spec, { loadBundle, injectHTML }) => {
            // if you want to load the support bundle you need to do it before the test-bundle
            if (supportFile) {
                const supportPath = path.resolve(path.join(outdir, supportFile.relative))
                loadBundle(supportPath)
            }

            // The path on the spec-object will have the original file extension. If the extension changed
            // during bundling you might have to adapt the path accordingly. You need to provide an absolute path to the file.
            const testPath = path.resolve(path.join(outdir, spec.relative.replace(spec?.fileExtension, '.js')))
            loadBundle(testPath)

            // per default html is injected at the end of the head element
            injectHTML('<style>body {background: red}</style>')
            // but you can also specify a selector for a different element. The html will be appended to the first matching element.
            injectHTML('<div class="portal"></div>', 'body')
        },
        // this callback will be called every time new tests are added or removed
        // you can use it to update your build-tool
        onSpecChange: async (newSpecs) => {
            await onClose()
            onClose = await startBuildInWatchMode({
            entryPoints: [...newSpecs.map((spec) => spec.absolute), supportFile && supportFile.absolute],
            onBuildComplete,
            onBuildStart
        })
        },
        // you can provide a custom port for the dev-server to use. default is 0, which means pick a random port
        devServerPort: 0
    }
})

const config = defineConfig({
    component: {
        devServer
    }
})
```
