describe('Copy Edition', function() {

    beforeEach(() => {
        cy.visit('http://localhost:8080')
    });

    Cypress.Commands.add('typeLogin', (user) => {
        cy.get('input[type=email]')
            .type(user.email)
        cy.get('input[type=password]')
            .type(user.password)
    })

    Cypress.Commands.add('PostLogin', () => {
        cy.intercept('POST', '/v1/users/login').as('postUser')
        cy.get('.btn-login-modal').should('not.be.disabled').click()
        cy.wait('@postUser')
    })

    // Click the "Copy" button on the public edition card whose title is exactly `name`.
    // (Clicking the card body itself navigates to the edition, so we scope to the button.)
    Cypress.Commands.add('ClickCopyOnCard', (name) => {
        cy.contains('.card-title', new RegExp('^\\s*' + name + '\\s*$'))
            .parents('.edition-public-grid')
            .contains('button', 'Copy')
            .click()
    })

    Cypress.Commands.add('PostCopyEdition', () => {
        cy.intercept('POST', '/v1/editions/*').as('postCopy')
        cy.get('#copy-edition-modal___BV_modal_footer_').contains('button', 'Copy').click()
        cy.wait('@postCopy')
    })

    it('CopyNotLogin', function() {
        // A logged-out visitor can browse public editions but cannot copy one:
        // the copy modal tells them to log in first.
        cy.visit('http://localhost:8080/home/public')
        cy.ClickCopyOnCard('1Q7')
        cy.get('#copy-edition-modal', { timeout: 15000 })
            .should('be.visible')
            .and('contain', 'logged in')
    })

    it('CopyLogin', () => {

        cy.get('.btn-login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.contains('[role="tab"]', 'Public').click()

        cy.ClickCopyOnCard('1Q7')

        cy.get('#newCopyName', { timeout: 15000 }).should('be.visible')
        cy.get('#newCopyName').clear() /* clear the prefilled name and set a new one */
        cy.get('#newCopyName').type('1Q7Copy')
        cy.PostCopyEdition()
        cy.get('@postCopy').should((response) => {
            expect(response.response.statusCode).to.eq(200) /* copy succeeded */
        })
    })

})
