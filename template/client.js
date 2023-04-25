/* eslint-env browser */
// This file is merged in a <script type=module> into index.html
// it will be used to load and kick start the selected spec

const CypressInstance = (window.Cypress = parent.Cypress)

if (!CypressInstance) {
    throw new Error('Tests cannot run without a reference to Cypress!')
}

const devServerPublicPathRoute = CypressInstance.config('devServerPublicPathRoute')

const fetchSpecData = async () => {
    const setupInfo = await fetch(`${devServerPublicPathRoute}/scriptInfo`, {
        method: 'post',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            spec: CypressInstance.spec
        })
    })
        .then((r) => r.json())
    
    const { bundles = [], htmlSnippets = [] } = setupInfo
    await bundles.reduce((promise, path) => promise.then(() => import(path)), Promise.resolve())
    htmlSnippets.forEach((snippet) => {
        const anchor = snippet.anchor || 'head'
        const anchorElement = document.querySelector(anchor)
        anchorElement.innerHTML += snippet.html
    })
}

CypressInstance.onSpecWindow(window, [fetchSpecData])

// then start the test process
CypressInstance.action('app:window:before:load', window)
