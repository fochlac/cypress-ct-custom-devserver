import express from 'express'
import path from 'path'
import crypto from 'crypto'
import { readFile } from 'fs/promises'
import { AddressInfo } from 'net'
import { minimatch } from 'minimatch'

const clientScript = (bundles) => `
    const bundles = ${JSON.stringify(bundles)}
    const CypressInstance = (window.Cypress = parent.Cypress)
    if (!CypressInstance) {
        throw new Error('Tests cannot run without a reference to Cypress!')
    }
    CypressInstance.onSpecWindow(window, [() => bundles.reduce((promise, path) => promise.then(() => import(path)), Promise.resolve())])
    CypressInstance.action('app:window:before:load', window)
`
const fallbackIndexHtml = `<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body><div data-cy-root></div></body>
</html>`

const sourceMapRegexp = /\/\/# sourceMappingURL=(.*).map/

const pathToSpec = (relativePath: string, root: string): CustomDevServer.BrowserSpec => {
    const baseName = relativePath.split(path.sep).slice(-1)[0]
    return {
        absolute: path.join(root, relativePath),
        relative: relativePath,
        name: baseName,
        specType: 'component',
        baseName,
        fileName: baseName.split('.')[0],
        specFileExtension: '.' + baseName.split('.').slice(1).join('.'),
        fileExtension: '.' + baseName.split('.').slice(-1)[0],
    } as CustomDevServer.BrowserSpec
}

export function createCustomDevServer(initBuildCallback: CustomDevServer.InitBuildCallback) {
    const createUrl = (path: string) => {
        const externalUrlKey = crypto.createHash('md5').update(path).digest('hex')
        const fileEnding = path.split('.').pop() || ''

        return `${externalUrlKey}${fileEnding ? '.' + fileEnding : ''}`
    }

    return async ({ cypressConfig, specs, devServerEvents }: CustomDevServer.DevServerOptions): Promise<Cypress.ResolvedDevServerConfig> => {
        const specPatterns = (Array.isArray(cypressConfig.specPattern) ? cypressConfig.specPattern : [cypressConfig.specPattern])
            .map(pattern => pattern.replace(/^.\//, ''))

        let started: (port: number) => void
        let isBuilding: false | Promise<void> = false
        let done = Function.prototype
        let log = Function.prototype
        const bundleRegistry = new Map()

        const app = express()

        // wait for build to be finished before serving files
        app.use(async (_req, _res, next) => {
            log(6, 'Stalling request, waiting for rebuild to finish...')
            if (isBuilding) await isBuilding
            log(6, 'Rebuild finished, continue request.')
            next()
        })

        const { onSpecChange, loadTest, devServerPort, onClose, logFunction } = await initBuildCallback({
                cypressConfig,
                specs,
                supportFile: cypressConfig.supportFile && {
                    absolute: cypressConfig.supportFile,
                    relative: cypressConfig.supportFile.replace(cypressConfig.projectRoot, ''),
                    name: path.basename(cypressConfig.supportFile),
                    fileExtension: path.extname(cypressConfig.supportFile)
                } as CustomDevServer.BrowserSpec,

                onBuildComplete: () => {
                    devServerEvents.emit('dev-server:compile:success')
                    done()
                },

                onBuildStart: () => {
                    if (isBuilding === false) {
                        isBuilding = new Promise((resolve) => {
                            log(5, 'Devserver signaled start of build. Stalling all requests.')
                            done = () => {
                                log(5, 'Devserver signaled end of build. Resuming all requests.')
                                resolve()
                                isBuilding = false
                                done = Function.prototype
                            }
                        })
                    }
                },

                serveStatic: (folder, path = '/') => {
                    log(6, `Adding static route from '${path}' to folder '${folder}'.`)
                    app.use(`${cypressConfig.devServerPublicPathRoute}/${path}`.replaceAll('//', '/'), express.static(folder))
                    app.use(path, express.static(folder))
                }
            })

        log = (logLevel, ...messages) => typeof logFunction === 'function' && logFunction(logLevel, ...messages)

        devServerEvents.on('dev-server:specs:changed', (specs) => {
            if (typeof onSpecChange === 'function') {
                log(5, 'Test files changed. Rebuilding...')
                onSpecChange(specs)
            } else {
                log(3, 'Test files changed. Please restart the server.')
            }
        })

        let lastTestBasePath
        app.get(cypressConfig.devServerPublicPathRoute + '/index.html', async (req, res) => {
            const testPath = path.relative(cypressConfig.projectRoot, req.headers.__cypress_spec_path as string)
            const isTest = specPatterns.some((pattern) => minimatch(testPath, pattern))

            if (!isTest && (!lastTestBasePath || !testPath.includes(lastTestBasePath))) {
                log(4, `Non-testfile requested with relative url: "${testPath}" but could not be matched.`)
                return res.send('')
            }
            else if (!isTest) {
                log(6, `Non-testfile requested with relative url: "${testPath}" and redirected.`)
                const relativePath = testPath.replace(lastTestBasePath, '').split(path.sep).join('/')
                return res.redirect(`${cypressConfig.devServerPublicPathRoute}/${relativePath}`.replaceAll('//', '/'))
            }
            else {
                lastTestBasePath = testPath.split(path.sep).slice(0, -1).join(path.sep)
            }
            log(4, `Index.html requested for test ${testPath}`)

            let html = fallbackIndexHtml
            try {
                html = await readFile(path.join(cypressConfig.projectRoot, cypressConfig.indexHtmlFile), 'utf8')
            }
            catch (e) {
                log(3, 'Index.html missing.')
            }

            const bundles: string[] = []
            const htmlSnippets: { html: string, anchor?: string }[] = []
            const utils: CustomDevServer.LoadTestUtils = {
                loadBundle: (path) => {
                    const url = `${cypressConfig.devServerPublicPathRoute}/${createUrl(path)}`
                    bundles.push(url)
                    log(5, `Bundle mapping: "${url}" to "${path}".`)
                    bundleRegistry.set(url, { path })
                },
                injectHTML: (html, anchor = 'head') => {
                    if (!['head', 'body'].includes(anchor)) throw new Error('Only "head" and "body" are allowed as anchors.')
                    htmlSnippets.push({ html, anchor })
                }
            }

            await loadTest(pathToSpec(testPath, cypressConfig.projectRoot), utils)

            // inject the kickstart script
            let outString = html.replace('</head>', `<script type="module">${clientScript(bundles)}</script></head>`)

            htmlSnippets.forEach(({ html, anchor }) => {
                outString = outString.replace(`</${anchor}>`, `${html}</${anchor}>`)
            })

            res.status(200).send(outString)
        })

        app.get(`${cypressConfig.devServerPublicPathRoute}/*`, async (req, res) => {
            try {
                if (/.map$/.test(req.path)) {
                    const basePath = req.path.replace(/.map$/, '')
                    const { path } = bundleRegistry.get(basePath) ?? {}
                    if (path) {
                        return res.sendFile(path + '.map')
                    }
                }
                const { path } = bundleRegistry.get(req.path) ?? {}
                if (path) {
                    let data = await readFile(path, 'utf8');
                    if (sourceMapRegexp.test(data)) {
                        data = data.replace(sourceMapRegexp, `//# sourceMappingURL=${req.path}.map`)
                    }

                    return res.header('Content-Type', 'application/javascript; charset=UTF-8').send(data)
                }
            }
            catch (e) {
                log(3, 'Unknown file or bad mapping: ', req.path)
            }
            res.status(404).send('Unknown file or bad mapping.')
        })

        app.use('*', (req, res) => {
            log(4, 'Could not match request to url: ', req.originalUrl)
            res.status(404).send()
        })

        const server = app.listen(devServerPort ?? 0, () => {
            const { port } = server.address() as AddressInfo
            log(2, 'Dev server started on port: ', port)
            started(port)
        })

        return new Promise(resolve => {
            started = (port: number) => resolve({
                port,
                close: async (done) => {
                    if (typeof onClose === 'function') {
                        await onClose()
                    }
                    server.close(() => {
                        log(2, 'Devserver shut down.')
                        done()
                    })
                }
            })
        })
    }
}