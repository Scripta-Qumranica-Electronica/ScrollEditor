describe('Rename Editor', function() {
    beforeEach(() => {
        cy.visit('http://localhost:8080')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()


    });
    let inputName; /* create variable of inputname  */
    let name; /* create variable  to be equal to editor  */
    let newRename; /* create variable for new name  of editor */

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

    // After Login choose card '1QS990' 
    it('RenameEditor', () => {
        cy.get('ul>li.list-item>.card').contains('1Q7Copy').first()
            .click({ multiple: true })

        cy.get('.sidebar-header>h5')
            .invoke('text')
            .then(text => {
                name = text.trim();

            });

        cy.get('.sidebar-header>.btn-rename').click()
        cy.get('.sidebar-header>input.new-edition')
            .invoke('val')
            .then(text => {
                inputName = text;
                cy.log(inputName)
                expect(inputName).to.eq(name)
            });
        cy.wait(2500)
        cy.get('.sidebar-header>input.new-edition').clear() /* clear the input and rename new name */
        cy.get('.sidebar-header>input.new-edition').type('1QCopyRename')
        cy.get('.sidebar-header>.btn-save').click()
        cy.wait(1000)
        cy.get('.navbar-dark>li.editionId>a')
            .invoke('text')
            .then(text => {
                newRename = text;
                expect(newRename).to.not.equal(name)
                expect(newRename).to.equal('1QCopyRename')
            })

    })

})