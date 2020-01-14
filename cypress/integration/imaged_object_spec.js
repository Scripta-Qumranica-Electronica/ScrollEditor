describe('Imaged Object', function() {
    beforeEach(() => {
        cy.visit('/')
    });

    let NewD
    let D
    let DBeforeErase
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


    it('Imaged ObjectFF ', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })

        cy.get('ul>li.list-item>.card').contains('1QS990').click()
        cy.wait(2500)
        cy.get('.nav-item:nth-child(2)>a.nav-link>a').click()
        cy.get('ul>li.list-item>.card').first().click()
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-pencil').click()
        cy.wait(2500)



        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                D = text;
                cy.log(D);
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

                cy.log(NewD);
                expect(D).not.to.eq(NewD)
            });
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#imaged-object-menu section:nth-child(4) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(4) button').click()

    })

    it('Save ', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item:nth-child(2)>a.nav-link>a').click()
        cy.get('ul>li.list-item>.card').first().click()
            // cy.get('#buttons-div>button.sidebarCollapse:nth-child(2)').click()
        cy.wait(2500)
        let DAfterSave

        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DAfterSave = text;
                cy.log(DAfterSave);
                cy.log(NewD);
                expect(DAfterSave).to.eq(NewD)
            });
    })


    it('Erase ', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item:nth-child(2)>a.nav-link>a').click()
        cy.get('ul>li.list-item>.card').first().click()
        cy.get('#buttons-div>button.sidebarCollapse>i.fa-trash').click()
        cy.wait(2500)

        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DBeforeErase = text;
                cy.log(DBeforeErase);
            });


        cy.get('g.draw-boundary')
            .trigger('pointermove', 100, 150)
            .trigger('pointerdown', 100, 150)
            .trigger('pointermove', 110, 150)
            .trigger('pointermove', 110, 180)
            .trigger('pointermove', 100, 150)
            .trigger('pointerup', 100, 150)


        cy.get('#buttons-div>button.sidebarCollapse>i.fa-align-justify').click()
        cy.get('#imaged-object-menu section:nth-child(4) div header a').click()
        cy.get('#accordion-actions .card-body section:nth-child(4) button').click()


    })

    it('SaveAfterErase ', () => {

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })
        cy.get('ul>li.list-item>.card').contains('1QS990').first()
            .click({ multiple: true })
        cy.wait(2500)
        cy.get('.nav-item:nth-child(2)>a.nav-link>a').click()
        cy.get('ul>li.list-item>.card').first().click()


        let DAfterSaveErase

        cy.get('.drawer path')
            .invoke('attr', 'd')
            .should('contain', 'M')
            .then(text => {
                DAfterSaveErase = text;
                cy.log(DAfterSaveErase);
                expect(DAfterSaveErase).to.not.equal(DBeforeErase)
            });

    })



})