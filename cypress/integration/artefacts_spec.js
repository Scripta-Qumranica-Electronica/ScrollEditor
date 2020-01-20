describe('Imaged Object', function() {
    beforeEach(() => {
        cy.visit('/')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item>a.nav-link>a.artefacts').click()
        cy.get('ul>li.list-item>.card').first().click()
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
        cy.get('button[type=submit]').click()
        cy.wait('@postUser')
    })



    it('Artefact textFragment ', () => {
        cy.get('#my-list-id option').should('have.length', 11)
        cy.get('input').type('col. 5')
    })




})