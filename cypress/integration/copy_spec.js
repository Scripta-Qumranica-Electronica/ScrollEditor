describe('Copy Artefact', function() {
    beforeEach(() => {
        cy.visit('/')
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
        cy.route('POST', '/v1/editions/1').as('postCopy')
        cy.get('#copyModal___BV_modal_footer_>button:nth-child(2)').click()
        cy.wait('@postCopy')
    })

    it('CopyNotLogin', function() {
        let valueText
        cy.get('ul>li.list-item>.card').contains('1QS').click()
        cy.get('.no-vers')
            .invoke('text')
            .then(text => {
                valueText = text.trim();
                cy.log(valueText);
                expect(valueText).to.eq('No other versions')
            });

    })

    it('CopyLogin', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        let h5

        cy.get('ul#all-search-results>li.list-item>.card').contains('1QS').click()

        cy.get('.sidebar-header>h5')
            .invoke('text')
            .then(text => {
                h5 = text.trim();

                cy.log(h5);
            });
        cy.get('.btn-copy').click()
        cy.wait(2500)
        cy.get('#newName')
            .invoke('val')
            .then(text => {
                const someText = text;
                cy.log(someText);
                expect(someText).to.eq(h5)

            });
        cy.wait(2500)
        cy.get('#newName').clear()
        cy.get('#newName').type('1QS990')
        cy.PostCopyArtefact()
        cy.get('@postCopy').should((respon) => {
            expect(respon.status).to.eq(200)
        })
    })

})