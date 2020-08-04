describe('Select language', function() {
    beforeEach(() => {
        cy.visit('http://localhost:8080')
    });
    it('English', function() {
        cy.get('#language').click()
        cy.get('ul>li.select-lang:nth-child(1)').contains('English').click()
        cy.get('label.filter')
            .invoke('text')
            .then(text => {
                labelText = text;
                expect(labelText).to.eq('Filter Editions:')

            });

    })
    it('Francais', function() {
        cy.get('#language').click()
        cy.get('ul>li.select-lang:nth-child(2)').contains('Français').click()
        cy.get('label.filter')
            .invoke('text')
            .then(text => {
                labelText = text;
                expect(labelText).to.eq("Filtre d'éditions:")

            });

    })


})