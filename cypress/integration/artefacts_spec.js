describe('Imaged Artefact', function() {
    beforeEach(() => {
        cy.visit('/')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()


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

    Cypress.Commands.add('PostRois', () => {
        cy.server()
        cy.route('POST', '/v1/editions/1646/rois/batch-edit').as('postPath')
        cy.ActionButton()
        cy.wait('@postPath')

    })

    // The way to get a save button
    Cypress.Commands.add('ActionButton', () => {

        cy.get('#artefact-and-buttons>.btn-menu-Artefact>.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#artefact-side-menu section:nth-child(3) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(2) button').click()


    })

    // After Login choose card '1QS990' 
    Cypress.Commands.add('actionAfterLogin', () => {
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })

        cy.get('.nav-item>a.nav-link>a.artefacts').click()
        cy.get('ul>li.list-item>.card').first().click()
    })


    it('Artefact textFragment ', () => {
        cy.actionAfterLogin();
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#my-list-id option').should('have.length', 11) /*Checks if 11 exists*/
            .first().should('have.text', 'col. 1')
            .next().should('have.text', 'col. 2')
            .next().should('have.text', 'col. 3')
            .next().should('have.text', 'col. 4')
            .next().should('have.text', 'col. 5')
            .next().should('have.text', 'col. 6')
            .next().should('have.text', 'col. 7')
            .next().should('have.text', 'col. 8')
            .next().should('have.text', 'col. 9')
            .next().should('have.text', 'col. 10')
            .next().should('have.text', 'col. 11')
        cy.get('input.select-text').type('col. 5').blur()
        cy.get(':nth-child(5) > :nth-child(76)').click({ force: true })
        cy.get('#my-list-id option').should('have.length', 10) /*After choose checks  if 10 exists*/
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-pencil-square-o').click() /*Create the shape*/

        cy.get('g#transform-root')
            .trigger('pointermove', 290, 250)
            .trigger('pointerdown', 290, 250)
            .trigger('pointermove', 370, 270)
            .trigger('pointermove', 300, 230)
            .trigger('pointermove', 290, 250)
            .trigger('pointerup', 290, 250)

        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click() /*Delete the shape*/
        cy.get('input.select-text').clear()
        cy.get('#my-list-id option').should('have.length', 11) /*And check again afeter erase if 11 exists*/
        cy.get('input.select-text').type('col. 2').blur()

        cy.get(':nth-child(4) > :nth-child(28)').click({ force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-square-o').click({ force: true })
        cy.get('g#transform-root') /*Create the shape*/
            .trigger('pointermove', 290, 250)
            .trigger('pointerdown', 290, 250)
            .trigger('pointermove', 350, 280)
            .trigger('pointerup', 350, 280)
        cy.get(':nth-child(14) > :nth-child(44)').click({ force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-refresh').click({ force: true }) /*Use button auto for create new shapes */
        cy.get('g#transform-root') /*first shape */
            .trigger('pointermove', 200, 220)
            .trigger('pointerdown', 200, 220)
            .trigger('pointermove', 240, 250)
            .trigger('pointerup', 240, 250)
        cy.get('g#transform-root') /*seconde shape*/
            .trigger('pointermove', 150, 250)
            .trigger('pointerdown', 150, 250)
            .trigger('pointermove', 190, 280)
            .trigger('pointerup', 190, 280)
        cy.PostRois() /*Save the shape*/
        cy.get('#transform-root>g:nth-child(2)').find('path').should('have.length', 3) /*Check exict one path*/

    })


    it('save ', () => {
        cy.get('nav.bg-dark>a.navbar-brand').click() /*Select the path I created and erased And checks not exict*/
        cy.actionAfterLogin();

        cy.wait(2500)
        cy.get('#transform-root>g:nth-child(2)').find('path:nth-child(1)').click()
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click()
        cy.ActionButton();
        cy.get('#transform-root>g:nth-child(2)').find('path').should('have.length', 2)

    })
})