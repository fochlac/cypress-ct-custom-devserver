declare namespace CustomDevServer {
    interface BrowserSpec {
        id: string;
        name: string;
        specType: string;
        absolute: string;
        baseName: string;
        fileName: string;
        specFileExtension: string;
        fileExtension: string;
        relative: string;
    }

    interface BuildCallbackOptions {
        cypressConfig: Cypress.PluginConfigOptions
        onBuildComplete: () => void
        onBuildStart: () => void
        specs: Cypress.Spec[]
        supportFile: BrowserSpec | false,
        serveStatic: (folder: string, path?: string) => void
    }

    interface LoadTestUtils {
        loadBundle: (absolutePath: string) => void
        injectHTML: (html: string, anchor?: 'head' | 'body') => void
        transformHTML: (html: string) => string
    }

    interface BuildCallbackResult {
        loadTest: (spec: BrowserSpec, utils: LoadTestUtils) => Promise<void> | void
        onSpecChange?: (newSpecs: Cypress.Spec[]) => Promise<void> | void
        onJustInTimeComplileRequest?: (event: { specs: Cypress.Spec[], options: { neededForJustInTimeCompile: boolean } }) => Promise<void> | void
        devServerPort?: number
        onClose?: () => Promise<void> | void
        logFunction?: (logLevel: number, ...params: (string | number)[]) => void
    }

    interface DevServerOptions {
        specs: Cypress.Spec[]
        cypressConfig: Cypress.PluginConfigOptions
        devServerEvents: NodeJS.EventEmitter
    }

    type InitBuildCallback = (options: BuildCallbackOptions) => BuildCallbackResult | Promise<BuildCallbackResult>
}