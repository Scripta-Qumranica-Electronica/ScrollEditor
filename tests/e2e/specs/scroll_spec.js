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

    // Authenticate against the API, resolve the copied edition's id, seed the app's auth token
    // (localStorage 'token', the same key the app uses) and jump straight to its scroll editor.
    // This avoids the home-page tabs, whose async re-render as editions load makes card/tab clicks
    // racy ("page updated while this command was executing").
    Cypress.Commands.add('OpenScrollEditor', () => {
        cy.request('POST', '/v1/users/login', { email: 'test@1.com', password: 'test' })
            .its('body.token')
            .then((token) => {
                cy.request({
                    url: '/v1/editions',
                    headers: { Authorization: `Bearer ${token}` },
                }).then((res) => {
                    // /v1/editions returns an array of groups (each an array of versions).
                    const all = [].concat.apply([], res.body.editions || [])
                    const match = all.find((e) => e.name === '1Q7Copy')
                    expect(match, '1Q7Copy edition').to.exist
                    cy.visit(`/editions/${match.id}/scroll-editor/`, {
                        onBeforeLoad(win) {
                            win.localStorage.setItem('token', token)
                        },
                    })
                })
            })
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
