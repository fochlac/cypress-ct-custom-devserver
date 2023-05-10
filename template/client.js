/* eslint-env browser *//* global bundles */
// This file is merged in a <script type=module> into index.html
// it will be used to load and kick start the selected spec

const CypressInstance = (window.Cypress = parent.Cypress)

if (!CypressInstance) {
    throw new Error('Tests cannot run without a reference to Cypress!')
}

const fetchSpecData = async () => {    
    await bundles.reduce((promise, path) => promise.then(() => import(path)), Promise.resolve())
}

CypressInstance.onSpecWindow(window, [fetchSpecData])

// then start the test process
CypressInstance.action('app:window:before:load', window)
