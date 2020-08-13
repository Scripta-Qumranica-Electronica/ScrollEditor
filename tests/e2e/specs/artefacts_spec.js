describe('Imaged Artefact', function() {
    beforeEach(() => {
        cy.visit('http://localhost:8080')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()


    });
    let afterChoice;
    let beforeChoice;

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

    Cypress.Commands.add('actionAfterLogin', () => {
        cy.get('ul>li.list-item>.card').contains('1Q7Copy').first()
            .click({ multiple: true })

        cy.get('.nav-item>a.nav-link>a.artefacts').click()
        cy.get('ul>li.list-item>.card').first().click()
    })


    it('Artefact textFragment ', () => {
        cy.actionAfterLogin();
        cy.wait(2500)
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#my-list-id option').should('have.length.greaterThan', 1)
        cy.get('#my-list-id option').then((g) => {
            beforeChoice = g.length;
            cy.log(beforeChoice)
        })
        cy.server()
        cy.route('GET', '/v1/editions/**/text-fragments/**').as('textFragmentReq')
        cy.get('input.select-text').type('col. 1').blur()

        cy.wait('@textFragmentReq')
        cy.get('#text-box:first > :nth-child(1) > :nth-child(32)').click({ force: true })
        cy.get('#my-list-id option').then((g) => {
            afterChoice = g.length;
            cy.log(afterChoice)
            expect(beforeChoice).to.be.greaterThan(afterChoice);
        })

        // cy.get('[data-original-title="Menu TextFragment"] > .fa').click()
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-square-o').click() /*Create the shape*/

        cy.get('svg.overlay')
            .trigger('pointermove', { clientX: 150, clientY: 400 }, { force: true })
            .trigger('pointerdown', { clientX: 150, clientY: 400 }, { force: true })
            .trigger('pointermove', { clientX: 150, clientY: 450 }, { force: true })
            .trigger('pointermove', { clientX: 200, clientY: 450 }, { force: true })
            .trigger('pointerup', { clientX: 200, clientY: 450 }, { force: true })

        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click({ force: true }) /*Delete the shape*/
        cy.get('input.select-text').clear()
        cy.get('#my-list-id option').then((g) => {
            afterClear = g.length;
            expect(beforeChoice).eq(afterClear);
        })
        cy.get('input.select-text').type('col. 2').blur()

        cy.wait(2500)
        cy.get('#accordion-0 > #text-box:first > :nth-child(1) > :nth-child(15)').click({ force: true })
        cy.get('[data-original-title="Menu TextFragment"] > .fa').click()
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-pencil-square-o').click({ force: true })
        cy.get('svg.overlay') /*Create the shape*/
            .trigger('pointermove', { clientX: 440, clientY: 270 }, { force: true })
            .trigger('pointerdown', { clientX: 440, clientY: 270 }, { force: true })
            .trigger('pointermove', { clientX: 460, clientY: 418 }, { force: true })
            .trigger('pointermove', { clientX: 460, clientY: 385 }, { force: true })
            .trigger('pointerup', { clientX: 460, clientY: 385 }, { force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-play').click({ force: true }) /*Use button auto for create new shapes */
        cy.get('svg.overlay') /*first shape */
            .trigger('pointermove', { clientX: 150, clientY: 400 }, { force: true })
            .trigger('pointerdown', { clientX: 150, clientY: 400 }, { force: true })
            .trigger('pointermove', { clientX: 150, clientY: 450 }, { force: true })
            .trigger('pointermove', { clientX: 200, clientY: 450 }, { force: true })
            .trigger('pointerup', { clientX: 200, clientY: 450 }, { force: true })
        cy.wait(2500)
        cy.get('svg.overlay') /*seconde shape */
            .trigger('pointermove', { clientX: 190, clientY: 450 }, { force: true })
            .trigger('pointerdown', { clientX: 190, clientY: 450 }, { force: true })
            .trigger('pointermove', { clientX: 190, clientY: 500 }, { force: true })
            .trigger('pointermove', { clientX: 220, clientY: 500 }, { force: true })
            .trigger('pointerup', { clientX: 220, clientY: 500 }, { force: true })
        cy.wait(2500)
        cy.get('#transform-root>g:nth-child(2)').find('path').should('have.length', 3) /*Check exict one path*/

        cy.get('#transform-root>g:nth-child(2)').find('path:first').click({ force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click({ force: true }) /*Delete the shape*/
        cy.get('#transform-root>g:nth-child(2)').find('path:first').click({ force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click({ force: true }) /*Delete the shape*/
        cy.get('#transform-root>g:nth-child(2)').find('path:first').click({ force: true })
        cy.get('.buttons-div.btn-tf>button.sidebarCollapse>i.fa-trash').click({ force: true }) /*Delete the shape*/
        cy.server()
        cy.route('POST', '/v1/editions/1646/rois/batch-edit').as('postPath')
        cy.wait('@postPath')
        cy.get('@postPath').should((resp) => {
            expect(resp.status).to.eq(200)
        })

    })
})