import express from 'express'
import path from 'path'
import crypto from 'crypto'
import { readFile } from 'fs/promises'
import { AddressInfo } from 'net'
import bodyParser from 'body-parser'

const clientScript = readFile(path.join(__dirname, '../template/client.js'), 'utf8')
const fallbackIndexHtml = `<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body><div data-cy-root></div></body>
</html>`
const sourceMapRegexp = /\/\/# sourceMappingURL=(.*).map/

export function createCustomDevServer(initBuildCallback: CustomDevServer.InitBuildCallback) {
    const createUrl = (path: string) => {
        const externalUrlKey = crypto.createHash('md5').update(path).digest('hex')
        const fileEnding = path.split('.').pop() || ''

        return `${externalUrlKey}${fileEnding ? '.' + fileEnding : ''}`
    }

    return async ({ cypressConfig, specs, devServerEvents }: CustomDevServer.DevServerOptions): Promise<Cypress.ResolvedDevServerConfig> => {
        let started: (port: number) => void
        let isBuilding = false

        const app = express()

        const buildSetup = await initBuildCallback({
            specs,
            supportFile: cypressConfig.supportFile && {
                absolute: cypressConfig.supportFile,
                relative: cypressConfig.supportFile.replace(cypressConfig.projectRoot, ''),
                name: path.basename(cypressConfig.supportFile),
                fileExtension: path.extname(cypressConfig.supportFile)
            } as CustomDevServer.BrowserSpec,
            onBuildComplete: () => {
                isBuilding = false
                devServerEvents.emit('dev-server:compile:success')
            },
            onBuildStart: () => {
                isBuilding = true
            },
            serveStatic: (folder, path = '/') => {
                app.use(path, express.static(folder))
            }
        })

        devServerEvents.on('dev-server:specs:changed', (specs) => {
            if (typeof buildSetup.onSpecChange === 'function') {
                buildSetup.onSpecChange(specs)
            }
        })

        // wait for build to be finished before serving files
        app.use(async (_req, _res, next) => {
            if (isBuilding) await isBuilding
            next()
        })

        app.get(cypressConfig.devServerPublicPathRoute + '/index.html', async (_req, res) => {
            let html = fallbackIndexHtml
            try {
                html = await readFile(path.join(cypressConfig.projectRoot, cypressConfig.indexHtmlFile), 'utf8')
            }
            catch (e) {
                console.log('[DEV_SERVER] index.html missing.')
            }
            // inject the kickstart script
            const outString = html.replace('</head>', `<script type="module">${await clientScript}</script></head>`)
            res.status(200).send(outString)
        })

        const bundleRegistry = new Map()

        // serve the dist folder for the main js file and the css
        app.post(`${cypressConfig.devServerPublicPathRoute}/scriptInfo`, bodyParser.json(), async (req, res) => {
            const spec = req.body?.spec as CustomDevServer.BrowserSpec
            if (!spec?.relative) {
                return res.status(400).send('Spec missing!')
            }

            const bundles: string[] = []
            const htmlSnippets: { html: string, anchor?: string }[] = []
            const utils: CustomDevServer.LoadTestUtils = {
                loadBundle: (path) => {
                    const url = `${cypressConfig.devServerPublicPathRoute}/${createUrl(path)}`
                    bundles.push(url)
                    bundleRegistry.set(url, { path })
                },
                injectHTML: (html, anchor) => {
                    htmlSnippets.push({ html, anchor })
                }
            }

            await buildSetup.loadTest(spec, utils)

            res.status(200).json({ bundles, htmlSnippets })
        })

        app.get(`${cypressConfig.devServerPublicPathRoute}/*`, async (req, res) => {
            try {
                if (/.map$/.test(req.path)) {
                    const basePath = req.path.replace(/.map$/, '')
                    const {path} = bundleRegistry.get(basePath) ?? {}
                    if (path) {
                        return res.sendFile(path + '.map')
                    }
                }
                const {path} = bundleRegistry.get(req.path) ?? {}
                if (path) {
                    let data = await readFile(path, 'utf8');
                    if (sourceMapRegexp.test(data)) {
                        data = data.replace(sourceMapRegexp, `//# sourceMappingURL=${req.path}.map`)
                    }

                    return res.header('Content-Type', 'application/javascript; charset=UTF-8').send(data)
                }
            }
            catch(e) {
                console.log('[DEV_SERVER] Unknown file or bad mapping: ', req.path)
            }
            res.status(404).send('Unknown file or bad mapping.')
        })

        app.use('*', (req, res) => {
            console.log('[DEV_SERVER] Could not match request to url: ', req.originalUrl)
            res.status(404).send()
        })

        const server = app.listen(buildSetup.devServerPort ?? 0, () => {
            const { port } = server.address() as AddressInfo
            console.log('[DEV_SERVER] dev server started on port: ', port)
            started(port)
        })

        return new Promise(resolve => {
            started = (port: number) => resolve({ port, close: async (done) => {
                if (typeof buildSetup.onClose === 'function') {
                    await buildSetup.onClose()
                }
                server.close(done)
            } })
        })
    }
}