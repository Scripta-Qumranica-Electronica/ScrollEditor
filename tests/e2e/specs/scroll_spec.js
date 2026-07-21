// The scroll editor was completely redesigned (the old #custom-select / g#root /
// accordion-actions UI no longer exists), and the test edition 1Q7Copy — a copy of the
// public 1Q7 — contains no artefacts to place, scale, rotate or group. The original
// drag-based manipulation tests are therefore no longer meaningful. This spec is a
// robust smoke test of the redesigned scroll editor: it confirms the editor opens for a
// user-owned (copied) edition and that the Add-Artefact flow is wired up.
describe('Scroll Editor', function() {

    beforeEach(() => {
        cy.on('uncaught:exception', () => false)
        cy.visit('http://localhost:8080')
    });

    Cypress.Commands.add('typeLogin', (user) => {
        cy.get('input[type=email]').type(user.email)
        cy.get('input[type=password]').type(user.password)
    })

    Cypress.Commands.add('PostLogin', () => {
        cy.intercept('POST', '/v1/users/login').as('postUser')
        cy.get('.btn-login-modal').should('not.be.disabled').click()
        cy.wait('@postUser')
    })

    // Log in, open the copied edition 1Q7Copy, and go to its Manuscript (scroll) editor.
    Cypress.Commands.add('OpenScrollEditor', () => {
        cy.get('.btn-login').click()
        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()
        // 1Q7Copy is a personal (owned) edition; open it from the home list.
        cy.contains('.card-title', /^\s*1Q7Copy\s*$/, { timeout: 15000 }).click()
        // The edition navbar exposes the Manuscript (scroll) editor.
        cy.contains('a', 'Manuscript', { timeout: 15000 }).click()
        cy.url().should('include', 'scroll-editor')
    })

    it('opens the redesigned scroll editor for a copied edition', () => {
        cy.OpenScrollEditor()
        // The editor renders its toolbox and the scroll canvas.
        cy.get('.toolbox', { timeout: 20000 }).should('exist')
        cy.get('svg', { timeout: 20000 }).should('exist')
        cy.contains('button', 'Add artefact').should('be.visible')
    })

    it('opens the Add Artefact modal', () => {
        cy.OpenScrollEditor()
        cy.contains('button', 'Add artefact').click()
        cy.get('#addArtefactModal', { timeout: 15000 }).should('be.visible')
        cy.get('#searchValue').should('exist')
    })

})
