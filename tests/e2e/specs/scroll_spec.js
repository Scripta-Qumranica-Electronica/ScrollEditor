describe('Scroll Edition', function() {
    let artefactsPlacedCountBefore; //count of artefacts before do "add"
    let artefactsPlacedCountAfter; //count of artefacts after do "add"
    let scrollAfterUndo;
    let scrollAfterRedo;


    beforeEach(() => {
        cy.on('uncaught:exception', (err, runnable) => {
            // return false to prevent the error from
            // failing this test
            return false
        })
        cy.visit('http://localhost:8080')
        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })
        cy.PostLogin()
        cy.get('ul>li.list-item>.card').contains('1Q7Copy').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item>a.nav-link>a.scroll').click()
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

    Cypress.Commands.add('PostArtefactGroup', () => {
        cy.server()
        cy.route('POST', 'v1/editions/*/artefact-groups').as('postGroup')
            // cy.get('button[type=submit]').click()
        cy.wait('@postGroup')
    })

    Cypress.Commands.add('AccordionActions', () => {
        cy.get('#scroll-side-menu section:nth-child(5) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()
    })

    Cypress.Commands.add('TopDownAction', (btnIndex) => {
        cy.get('#the-scroll g#root>g').last().then(selected => {
            cy.get('.center-btn.mb-2 > .card > .card-header > .btn-group > :nth-child(' + btnIndex + ')').click()
            cy.get('#the-scroll g#root>g').last().then(
                lastposition => {
                    expect(lastposition[0].outerHTML).to.not.equal(selected[0].outerHTML);
                }
            )
        })
    })

    Cypress.Commands.add('GroupButtons', (actionsButton, selector) => {

        cy.get('#the-scroll g#root>g:last-of-type').invoke('attr', 'transform').then(
            (transformBefore) => {
                cy.get('#accordion-actions .card-body section:nth-child(1) div:nth-child(2)>section>div>header>div>button.' + actionsButton).click()
                cy.get(selector).click()
                cy.get('#the-scroll g#root>g:last-of-type').invoke('attr', 'transform').then((transformAfter) => {
                    expect(transformAfter).to.not.equal(transformBefore);
                })
            }
        )
    })

    it('Add artefact and Remove artefact', function() {
        // checking the status of the scroll before add or remove artefact
        if (Cypress.$('#the-scroll g#root>g').length) {
            cy.get('#the-scroll g#root>g').then((g) => {
                artefactsPlacedCountBefore = g.length;
            });

        } else {
            artefactsPlacedCountBefore = 0;
        }


        cy.AccordionActions()
        cy.get('#custom-select option').should('have.length.greaterThan', 1)
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click()
        cy.get('#the-scroll g#root>g').then((g) => {
            artefactsPlacedCountAfter = g.length;
            expect(artefactsPlacedCountAfter).to.be.greaterThan(artefactsPlacedCountBefore || 0);
        })

        artefactsPlacedCountBefore = artefactsPlacedCountAfter;
        cy.get('#accordion-actions .card-body section:nth-child(1) div>header div button.btn-remove:nth-child(2)').click()
        if (Cypress.$('#the-scroll g#root>g').length) {
            cy.get('#the-scroll g#root>g').then((g) => {
                artefactsPlacedCountAfter = g.length;
            });

        } else {
            artefactsPlacedCountAfter = 0;
        }

    })

    it('Scale, Move,Rotate', function() {

        cy.AccordionActions()
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click()
        cy.GroupButtons('btn-move', '.mt-2 > :nth-child(1) > .card > #accordion-actions > .card-body > .center-btn > .row > :nth-child(1) > table > :nth-child(2) > :nth-child(3) > .btn')
        cy.GroupButtons('btn-scale', '.mt-2 > :nth-child(1) > .card > #accordion-actions > .card-body > .center-btn > .row > .btn-group > :nth-child(1)')
        cy.GroupButtons('btn-rotate', '.mt-2 > :nth-child(1) > .card > #accordion-actions > .card-body > .center-btn > .row > .btn-group > :nth-child(2)')
    })


    it('Top , Down', function() {
        /*test for button down*/
        // add one artefact 
        cy.AccordionActions()
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click();

        // add second artefact if there is only one
        if (Cypress.$('#the-scroll g#root>g').length < 2) {
            cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()
            cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
            cy.get('.modal-footer > .btn').click()
        }
        cy.TopDownAction(2)
            /*test for button top*/
        cy.TopDownAction(1)

    })


    it('Undo, Redo', function() {

        // Count artefacts (n)
        artefactsPlacedCountBefore = Cypress.$('#the-scroll g#root>g').length;

        cy.AccordionActions()
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))

        // Add artefact (n + 1)
        cy.get('.modal-footer > .btn').click().then(() => {
            artefactsPlacedCountAfter = Cypress.$('#the-scroll g#root>g').length;

            // Undo ADD (n)
            cy.get(':nth-child(2) > .m-1 > :nth-child(1)').click().then(() => {
                scrollAfterUndo = Cypress.$('#the-scroll g#root>g').length;
                expect(scrollAfterUndo).to.equal(artefactsPlacedCountBefore);

                // Redo ADD (n + 1)
                cy.get(':nth-child(2) > .m-1 > :nth-child(2)').click().then(() => {
                    scrollAfterRedo = Cypress.$('#the-scroll g#root>g').length;
                    expect(scrollAfterRedo).to.equal(artefactsPlacedCountAfter);
                })
            })
        })
    })

    it('Manage Group', function() {
        cy.AccordionActions()
            //add two artefacts for create group
        cy.get('#custom-select > option').eq(5).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click()
        cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()
        cy.get('#custom-select > option').eq(4).then(element => cy.get('#custom-select').select(element.text()))

        cy.get('.modal-footer > .btn').click().then(() => {
            artefactsPlacedCountBefore = Cypress.$('#the-scroll g#root>g').length;
            cy.get(':nth-child(2) > .card > .card-header > .mb-1 > .btn').click()

            cy.get('#the-scroll g#root>g:nth-child(' + (artefactsPlacedCountBefore - 1) + ')>g').click({ force: true })
            cy.get('.row > .btn-group > :nth-child(1)').click()
            cy.PostArtefactGroup()

            cy.get('@postGroup').should((resp) => {
                expect(resp.status).to.eq(200)
            })
        })
    })

})