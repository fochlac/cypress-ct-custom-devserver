import React from 'react';
import { ImageTestComponent, TestComponent } from './TestComponent'

describe('Test.cy.tsx', () => {
  it('playground', () => {
    cy.mount(<TestComponent title="TitleText" text="BodyText" />)
    cy.contains('h1', 'TitleText').should('be.visible')
    cy.contains('p', 'BodyText').should('be.visible')
    cy.get('body [data-test="injection-body"]').should('exist')
    cy.get('head [data-test="injection-head"]').should('exist')
  })

  it('image with absolute path should load', () => {
    cy.mount(<ImageTestComponent src="/data/image.jpg" />)
    cy.get('[data-cy="state"]').should('contain.text', 'success')
    cy.get('img').should('be.visible').then(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0);
    })
  })

  it('image with relative path should load', () => {
    cy.mount(<ImageTestComponent src="./data/image.jpg" />)
    cy.get('[data-cy="state"]').should('contain.text', 'success')
    cy.get('img').should('be.visible').then(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0);
    })
  })
})