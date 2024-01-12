import express from 'express'
import path from 'path'
import { readFile } from 'fs/promises'
import { AddressInfo } from 'net'
import { minimatch } from 'minimatch'
import { createLoadTestUtils } from './util'


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

    return async ({ cypressConfig, specs, devServerEvents }: CustomDevServer.DevServerOptions): Promise<Cypress.ResolvedDevServerConfig> => {
        const specPatterns = (Array.isArray(cypressConfig.specPattern) ? cypressConfig.specPattern : [cypressConfig.specPattern])
            .map(pattern => pattern.replace(/^.\//, ''))

        let started: (port: number) => void
        let isBuilding: false | Promise<void> = false
        let done = Function.prototype
        let log = Function.prototype

        const app = express()

        // wait for build to be finished before serving files
        app.use(async (_req, _res, next) => {
            if (isBuilding) {
                log(6, 'Stalling request, waiting for rebuild to finish...')
                await isBuilding
                log(6, 'Rebuild finished, continue request.')
            }
            next()
        })

        const staticMappings = []
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
                staticMappings.push([folder, path])
            }
        })

        log = (logLevel, ...messages) => typeof logFunction === 'function' && logFunction(logLevel, ...messages)

        staticMappings.forEach(([folder, path]) => {
            log(6, `Adding static route from '${path}' to folder '${folder}'.`)
            app.use(`${cypressConfig.devServerPublicPathRoute}/${path}`.replaceAll('//', '/'), express.static(folder))
            app.use(path, express.static(folder))
        })

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

            let html = ''
            try {
                html = await readFile(path.join(cypressConfig.projectRoot, cypressConfig.indexHtmlFile), 'utf8')
            }
            catch (e) {
                log(3, 'Index.html missing.')
            }

            const utils = createLoadTestUtils(cypressConfig.devServerPublicPathRoute, log)

            await loadTest(pathToSpec(testPath, cypressConfig.projectRoot), utils)

            res.status(200).send(utils.transformHTML(html))
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