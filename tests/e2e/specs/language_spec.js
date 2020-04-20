describe('Select language', function() {
    beforeEach(() => {
        cy.visit('/')
    });
    it('English', function() {
        cy.get('#language').click()
        cy.get('ul>li.select-lang:nth-child(1)').contains('English').click()

    })
    it('Francais', function() {
        cy.get('#language').click()
        cy.get('ul>li.select-lang:nth-child(2)').contains('Français').click()

    })


})