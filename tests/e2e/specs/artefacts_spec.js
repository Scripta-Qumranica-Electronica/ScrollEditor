describe('Imaged Artefact', function () {
    beforeEach(() => {
        cy.visit('http://localhost:8080')
        cy.contains('button', 'Log in').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()


    });

    let valueHeight; /*create variable To maintain the current height -for zoom  */
    let newValueHeight; /*create variable To maintain the new height- for zoom  */
    let valueTransform; /*create variable To maintain the current transform -for value  */
    let newValueTransform; /*create variable To maintain the new transform -for value  */

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

    Cypress.Commands.add('Editions', () => {
        cy.intercept('GET', '/v1/editions').as('getEditions')
        cy.wait('@getEditions')
        cy.get('#Draft > .afterlogin > :nth-child(1)').click({ multiple: true })
        cy.get(':nth-child(1) > a > .side-edition').click()

    })

    it('Artefact textFragment and auto character ', () => {
        cy.Editions()
        cy.get('#my-list-id option').should('have.length', 4) /*Checks if 4 exists*/
            .first().should('have.text', ' col. 1 ')
            .next().should('have.text', ' col. 2 ')
            .next().should('have.text', ' col. 3 ')
            .next().should('have.text', ' col. 4 ')
        cy.get('.select-text').type('col. 2').blur()
        cy.get('#popover-si-998166 > .text-sign').click({ force: true })
        cy.get('#my-list-id option').should('have.length', 3) /*After choose checks  if 10 exists*/
        cy.get('[title="Draw"] > .btn').click() /*Create the shape*/
        cy.get('.overlay')
            .trigger('pointermove', 200, 200)
            .trigger('pointerdown', 200, 200)
            .trigger('pointermove', 220, 220)
            .trigger('pointermove', 240, 220)
            .trigger('pointermove', 240, 150)
            .trigger('pointerup', 240, 150)
        cy.get('[title="Delete ROI"] > .btn').click()
        cy.get('#popover-si-998238 > .text-sign').click({ force: true })
        cy.get('[title="Box"] > .btn > .fa').click() /*Create the shape*/
        cy.get('.overlay')
            .trigger('pointermove', 190, 200)
            .trigger('pointerdown', 190, 200)
            .trigger('pointermove', 120, 170)
            .trigger('pointerup', 120, 170)
        cy.get('#auto-character').click({ force: true })
        cy.get('#popover-si-998239 > .text-sign').click({ force: true })
        cy.get('[title="Box"] > .btn > .fa').click()
        cy.get('.overlay')
            .trigger('pointermove', 80, 140)
            .trigger('pointerdown', 80, 140)
            .trigger('pointermove', 100, 160)
            .trigger('pointerup', 100, 160)
        cy.get('.overlay')
            .trigger('pointermove', 50, 100)
            .trigger('pointerdown', 50, 100)
            .trigger('pointermove', 140, 200)
            .trigger('pointerup', 140, 200)
        cy.get('#popover-si-998240 > .text-sign').should('have.class', 'selected')
        cy.get('.overlay>#transform-root>g:nth-child(2)').find('g').should('have.length', 3)
        cy.get('.undo').click()/* check undo */
        cy.get('.overlay>#transform-root>g:nth-child(2)').find('g').should('have.length', 2)
        cy.get('.redo').click() /* check redo */
        cy.get('.overlay>#transform-root>g:nth-child(2)').find('g').should('have.length', 3)
        cy.get('.undo').click()
        cy.get('.undo').click()
        cy.get('.undo').click()

    })


    it('Comments ', () => {
        cy.Editions()
        cy.get('.select-text').type('col. 3').blur()
        cy.get('#popover-si-998511 > .text-sign').click({ force: true })
        cy.get('[title="Box"] > .btn > .fa').click()
        cy.get('.overlay')
            .trigger('pointermove', 80, 140)
            .trigger('pointerdown', 80, 140)
            .trigger('pointermove', 100, 160)
            .trigger('pointerup', 100, 160)
        cy.get('[title="Edit Comment"]').click({ force: true })
        cy.get('.ck-editor__main > .ck').type('comment').blur()
        cy.get('#comments').click({ force: true })
        cy.get('#popover-si-998511 > .text-sign').should('have.class', 'highlighted')
        cy.get('.ck-editor__main > .ck').type('comment').clear()
        cy.get('[title="Delete ROI"] > .btn').click({ force: true })
    })
    it('AddLeft/AddRight/Delete Sign ', () => {
        cy.Editions()
        cy.get('.select-text').type('col. 4').blur()
        /* check add left sign */
        cy.get('#popover-si-998793 > .text-sign').rightclick()
        cy.get('.add-left').click({ force: true })
        cy.get('#new-character').type('א')
        cy.get(':nth-child(2) > :nth-child(2) > .btn').click()
        cy.wait(5000)
        cy.get('#popover-si-998793').next().then(($si) => {
            const siId = $si.attr('id')
            expect(siId).to.not.equal('#popover-si-998794')
        })
        /* check add right sign */
        cy.get('#popover-si-998793 > .text-sign').rightclick()
        cy.get('.add-right').click({ force: true })
        cy.get('#new-character').clear()
        cy.get('#new-character').type('ג')
        cy.get(':nth-child(2) > :nth-child(2) > .btn').click()
        cy.wait(5000)
        cy.get('#popover-si-998793').prev().then(($si) => {
            const siId = $si.attr('id')
            expect(siId).to.not.equal('#popover-si-998792')
        })
        /* check delete sign */
        cy.get('#popover-si-998793 > .text-sign').rightclick()
        cy.get('.delete').click({ force: true })
        cy.get('#popover-si-998793').should('not.exist');
        cy.get('.undo').click()

    })

    it('Zoom', () => {
        /* check zoom */
        cy.Editions()
        cy.get('.overlay').then(($zoom) => {
            valueHeight = $zoom.attr('height')
        })
        cy.get('.col-5 > .btn-group > .mr-0').click({ force: true })
        cy.get('.overlay').then(($newZoom) => {
            newValueHeight = $newZoom.attr('height')
            expect(newValueHeight).to.not.equal(valueHeight)
        })
        cy.get('.col-5 > .btn-group > :nth-child(1)').click({ force: true })
        cy.get('.overlay').then(($newZoom) => {
            newValueHeight = $newZoom.attr('height')
            expect(newValueHeight).to.eq(valueHeight)
        })
    })


    it('Rotate', () => {
        /* check rotate */
        cy.Editions()
        cy.get('.overlay g#transform-root').then(($rotate) => {
            valueTransform = $rotate.attr('transform')
        })
        cy.get('[title="Left Rotate"]').click({ force: true })
        cy.get('.overlay g#transform-root').then(($rotate) => {
            newValueTransform = $rotate.attr('transform')
            expect(valueTransform).to.not.equal(newValueTransform)
        })
        cy.get('.undo').click()

    })
})

