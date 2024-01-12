
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

export const createUrl = (filePath: string) => filePath.split(/[/\\]+/).map(encodeURIComponent).join('/').trim().replace(/^\//, '')

export const createLoadTestUtils = (publicRoute, log): CustomDevServer.LoadTestUtils => {
    const bundles: string[] = []
    const snippets: { html: string, anchor?: string }[] = []

    return {
        loadBundle: (path) => {
            const url = `${publicRoute}/${createUrl(path)}`
            bundles.push(url)
            log(5, `Bundle mapping: "${url}" to "${path}".`)
        },
        injectHTML: (html, anchor = 'head') => {
            if (!['head', 'body'].includes(anchor)) throw new Error('Only "head" and "body" are allowed as anchors.')
            snippets.push({ html, anchor })
        },
        transformHTML: (html) => {
            if (!html?.length) {
                html = fallbackIndexHtml
            }
            // inject the kickstart script
            let outString = html.replace(/<\/\s*head\s*>/, `<script type="module">${clientScript(bundles)}</script></head>`)

            snippets.forEach(({ html, anchor }) => {
                outString = outString.replace(new RegExp(`</\\s*${anchor}\\s*>`), `${html}</${anchor}>`)
            })

            return outString
        }
    }
}