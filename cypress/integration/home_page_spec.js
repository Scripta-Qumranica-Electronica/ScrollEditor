describe('The Home Page', function() {

    it('Navigate to Testwebsite', () => {
        cy.visit('/')


    })
    it('Login to application', () => {
        const password = 'test'
        const email = 'test@1.com'
        cy.contains('button', 'Login').click()

        cy.get('input[type=email]').type(email)
            .should('have.value', email)


        cy.get('input[type=password]').type(password)
            .should('have.value', password)


        cy.server()
        cy.route('POST', '/v1/users/login').as('postUser')
        cy.get('button[type=submit]').click()
        cy.wait('@postUser')

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })

        // cy.request({
        //         method: 'POST',
        //         url: '/v1/users/login', // baseUrl is prepended to url
        //         // form: true, // indicates the body should be form urlencoded and sets Content-Type: application/x-www-form-urlencoded headers
        //         body: {
        //             password: 'test',
        //             email: 'test@1.com'
        //         }
        //     })
        // .then((resp) => {
        //     // redirect status code is 302
        //     expect(resp.status).to.eq(200)


        // })

    })
})