describe('Copy Edition', function () {

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
        cy.server()
        cy.route('POST', '/v1/users/login').as('postUser')
        cy.get('.w-100 > .btn').click()
        cy.wait('@postUser')
    })


    Cypress.Commands.add('PostCopyArtefact', () => {
        cy.server()
        cy.route('POST', '/v1/editions/*').as('postCopy')
        cy.get('.w-100 > .btn').click()
        cy.wait('@postCopy')
    })


    it('CopyLogin', () => {

        cy.contains('button', 'Log in').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()


        cy.get('.public-editions').click()
        cy.wait(2500)
        cy.get('#__BVID__50 > .bv-no-focus-ring > #filter').type('1Q7')
        cy.wait(2500)
        cy.get(':nth-child(4) > .edition-public > .mt-2 > .btn').trigger('click').click({ force: true })
        cy.get('#newName').clear() /* clear the input and create new name */
        cy.get('#newName').type('1Q7Copy')
        cy.PostCopyArtefact()
        cy.get('@postCopy').should((response) => {
            expect(response.status).to.eq(200) /* check if statut equal 200  */
        })

    })

})