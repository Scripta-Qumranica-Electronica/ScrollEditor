describe('Scroll Edition', function() {
    let artefactsPlacedCountBefore;
    let artefactsPlacedCountAfter;

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

    it('Add artefact and Remove artefact', function() {
        if (Cypress.$('#the-scroll g#root>g').length) {
            cy.get('#the-scroll g#root>g').then((g) => {
                artefactsPlacedCountBefore = g.length;
                cy.log(artefactsPlacedCountBefore)
            });

        } else {
            artefactsPlacedCountBefore = 0;
        }

        cy.get('#scroll-side-menu section:nth-child(5) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()


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
                cy.log(artefactsPlacedCountAfter)
            });

        } else {
            artefactsPlacedCountAfter = 0;
        }

    })

    it('Scale, Move,Rotate', function() {

        cy.get('#scroll-side-menu section:nth-child(5) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click()

        cy.get('#the-scroll g#root>g:last-of-type').invoke('attr', 'transform').then(
            (transformBefore) => {
                cy.get('#accordion-actions .card-body section:nth-child(1) div:nth-child(2)>section>div>header>div>button.btn-move').click()
                cy.get('.mt-2 > :nth-child(1) > .card > #accordion-actions > .card-body > .center-btn > .row > :nth-child(1) > table > :nth-child(2) > :nth-child(3) > .btn > .fa').click()
                cy.get('#the-scroll g#root>g:last-of-type').invoke('attr', 'transform').then((transformAfter) => {
                    expect(transformAfter).to.not.equal(transformBefore);
                })


            }
        )


    })


    it('Top , Down', function() {
        cy.get('#scroll-side-menu section:nth-child(5) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(1) div header div button.mr-2').click()
        cy.get('#custom-select > option').eq(1).then(element => cy.get('#custom-select').select(element.text()))
        cy.get('.modal-footer > .btn').click()
        cy.get('#the-scroll g#root>g').last().then(selected => {
            cy.get('.center-btn.mb-2 > .card > .card-header > .btn-group > :nth-child(2)').click()
            cy.get('#the-scroll g#root>g').last().then(
                lastposition => {
                    expect(lastposition[0].outerHTML).to.not.equal(selected[0].outerHTML);
                }
            )
        })
        cy.get('#the-scroll g#root>g').last().then(selected => {
            cy.get('.center-btn.mb-2 > .card > .card-header > .btn-group > :nth-child(1)').click()
            cy.get('#the-scroll g#root>g').last().then(
                lastposition => {
                    expect(lastposition[0].outerHTML).to.not.equal(selected[0].outerHTML);
                }
            )
        })

    })

})