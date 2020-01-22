describe('Imaged Artefact', function() {
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
    Cypress.Commands.add('ActionButton', () => {
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#imaged-object-menu section:nth-child(4) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(4) button').click()
    })


    it('Artefact textFragment ', () => {
            cy.get('#buttons-div>button.sidebarCollapse>i.fa-align-justify').click()
            cy.get('#my-list-id option').should('have.length', 11)
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
            cy.get('#my-list-id option').should('have.length', 10)
            cy.get('#buttons-div>button.sidebarCollapse>i.fa-pencil-square-o').click()

            cy.get('g#transform-root')
                .trigger('pointermove', 290, 250)
                .trigger('pointerdown', 290, 250)
                .trigger('pointermove', 370, 270)
                .trigger('pointermove', 300, 230)
                .trigger('pointermove', 290, 250)
                .trigger('pointerup', 290, 250)

            cy.get('#transform-root>g:nth-child(2)>path').should('have.length', 1)
            cy.get('#buttons-div>button.sidebarCollapse>i.fa-trash').click()
            cy.get('input.select-text').clear()
            cy.get('#my-list-id option').should('have.length', 11)
            cy.get('input.select-text').type('col. 2').blur()
            cy.get(':nth-child(4) > :nth-child(28)').click({ force: true })
            cy.get('#buttons-div>button.sidebarCollapse>i.fa-square-o').click()
            cy.get('g#transform-root')
                .trigger('pointermove', 290, 250)
                .trigger('pointerdown', 290, 250)
                .trigger('pointermove', 350, 280)
                .trigger('pointerup', 350, 280)
            let save = cy.get('#transform-root>g:nth-child(2)>path').should('have.length', 1)
            cy.ActionButton();

        })
        // it('save ', () => {})
})