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
        cy.server()
        cy.route('POST', '/v1/users/login').as('postUser')
        cy.get('button[type=submit]').click()
        cy.wait('@postUser')
    })


    Cypress.Commands.add('PostCopyArtefact', () => {
        cy.server()
        cy.route('POST', '/v1/editions/*').as('postCopy')
        cy.get('#copyModal___BV_modal_footer_>button:nth-child(2)').click()
        cy.wait('@postCopy')
    })

    it('CopyNotLogin', function() {
        let valueText
        cy.get('ul li.list-item .card').contains('1Q7 ').click()
        cy.get('.no-vers')
            .invoke('text')
            .then(text => {
                valueText = text.trim();
                expect(valueText).to.eq('No other versions')
                    /*Checks if  variable valueText equal 'No other versions' 
                                   if yes statut not login*/
            });

    })

    it('CopyLogin', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        let name /* create variable  to be equal to artefact id  */

        cy.get('ul#all-search-results>li.list-item>.card').contains('1Q7 ').click()

        cy.get('.sidebar-header>h5')
            .invoke('text')
            .then(text => {
                name = text.trim();

            });
        cy.get('.btn-copy').click() /*create copy and check if value in the input equal with variable name*/
        cy.wait(2500)
        cy.get('#newName')
            .invoke('val')
            .then(text => {
                const someText = text;
                expect(someText).to.eq(name)

            });
        cy.wait(2500)
        cy.get('#newName').clear() /* clear the input and create new name */
        cy.get('#newName').type('1Q7Copy')
        cy.PostCopyArtefact()
        cy.get('@postCopy').should((response) => {
            expect(response.status).to.eq(200) /* check if statut equal 200  */
        })
    })

})