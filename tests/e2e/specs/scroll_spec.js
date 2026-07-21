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

    // Set up an owned, editable edition and open its scroll editor — self-contained so it does not
    // depend on copy_spec's edition being visible yet. We authenticate against the API, copy the
    // public seed edition 1Q7 (the POST returns the new edition's id directly), seed the app's auth
    // token (localStorage 'token', the key the app reads) and jump straight to the scroll editor.
    // This avoids the home-page tabs, whose async re-render as editions load makes clicks racy.
    Cypress.Commands.add('OpenScrollEditor', () => {
        cy.request('POST', '/v1/users/login', { email: 'test@1.com', password: 'test' })
            .its('body.token')
            .then((token) => {
                const auth = { Authorization: `Bearer ${token}` }
                cy.request({ url: '/v1/editions', headers: auth }).then((res) => {
                    // /v1/editions returns an array of groups (each an array of versions).
                    const all = [].concat.apply([], res.body.editions || [])
                    const src = all.find((e) => e.name === '1Q7')
                    expect(src, 'public seed edition 1Q7').to.exist
                    cy.request({
                        method: 'POST',
                        url: `/v1/editions/${src.id}`,
                        headers: auth,
                        body: { name: 'ScrollSmoke' },
                    }).then((copyRes) => {
                        cy.visit(`/editions/${copyRes.body.id}/scroll-editor/`, {
                            onBeforeLoad(win) {
                                win.localStorage.setItem('token', token)
                            },
                        })
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
