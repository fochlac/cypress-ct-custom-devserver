import { createLoadTestUtils } from '../../src/util'

describe('Unit.cy.tsx', () => {
  it('should transform html', () => {
    const utils = createLoadTestUtils('/public', () => null)

    utils.loadBundle('/test/test2.js')
    utils.loadBundle('test/test3.js')
    utils.loadBundle('\\test\\test5.js')
    utils.loadBundle('test\\test6.js')
    utils.loadBundle('test\\\\test7.js')

    const urls = [
        '"/public/test/test2.js"',
        '"/public/test/test3.js"',
        '"/public/test/test5.js"',
        '"/public/test/test6.js"',
        '"/public/test/test7.js"'
    ]
    cy.wrap(utils.transformHTML('<html><head>something</head><body>body</body></html>')).should('contain', `const bundles = [${urls.join(',')}]`)
  })
})
