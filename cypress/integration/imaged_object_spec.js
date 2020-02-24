describe('Imaged Object', function() {
    beforeEach(() => {
        cy.visit('/')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item>a.nav-link>a.imagedObjects').click()
        cy.get('ul>li.list-item>.card').first().click()
    });

    let NewD /*A variable that saves the new shape */
    let OldPath /*A variable that saves the old shape */
    let DBeforeErase /*A variable that saves the situation before erase */
    let DAfterSave /*A variable that saves the situation after save */
    let DAfterSaveErase /*A variable that saves the situation after erase */

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
        // The way to get a save button
    Cypress.Commands.add('ActionButton', () => {
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#imaged-object-menu section:nth-child(4) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(4) button').click()
    })


    // Create new shape And check if it is not equal to the old value and save.
    it('Imaged Object Drawer ', () => {
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-pencil').click()
        cy.wait(2500)
        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                OldPath = text;

            });

        cy.get('g.draw-boundary')
            .trigger('pointermove', 100, 150)
            .trigger('pointerdown', 100, 150)
            .trigger('pointermove', 110, 150)
            .trigger('pointermove', 110, 180)
            .trigger('pointermove', 100, 150)
            .trigger('pointerup', 100, 150)



        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                NewD = text;

                expect(OldPath).not.to.eq(NewD)
            });
        cy.ActionButton();

    })

    // Going out and checking back with it kept the shape it created
    it('Save ', () => {
        cy.wait(2500)
        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DAfterSave = text;
                expect(DAfterSave).to.eq(NewD)
            });
    })

    // Deletes the shape I created and save.
    it('Erase ', () => {
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-trash').click()
        cy.wait(2500)

        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DBeforeErase = text;

            });


        cy.get('g.draw-boundary')
            .trigger('pointermove', 100, 150)
            .trigger('pointerdown', 100, 150)
            .trigger('pointermove', 110, 150)
            .trigger('pointermove', 110, 180)
            .trigger('pointermove', 100, 150)
            .trigger('pointerup', 100, 150)

        cy.ActionButton();


    })


    // Checking with it has been deleted forever.
    it('SaveAfterErase ', () => {

        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DAfterSaveErase = text;
                expect(DAfterSaveErase).to.not.equal(DBeforeErase)
            });

    })



})