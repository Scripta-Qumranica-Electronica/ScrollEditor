describe('The Home Page', function() {

    it('Navigate to Testwebsite', () => {
        cy.visit('/')


    })

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

    it('Login Fails', () => {

            cy.contains('button', 'Login').click()

            cy.typeLogin({ email: 'tests@1.com', password: 'tests' })

            cy.PostLogin()

            cy.get('@postUser').should((resp) => {
                expect(resp.status).to.eq(401)
            })

        })
        // it('Login Fails Data ', () => {

    //     cy.contains('button', 'Login').click()

    //     cy.typeLogin({ email: 'tests1.com', password: 'tests' })

    //     cy.PostLogin()

    //     cy.get('@postUser').should((resp) => {
    //         expect(resp.status).to.eq(400)
    //     })

    // })
    // it('Login Sucess', () => {

    //     cy.contains('button', 'Login').click()

    //     cy.typeLogin({ email: 'test@1.com', password: 'test' })

    //     cy.PostLogin()

    //     cy.get('@postUser').should((resp) => {
    //         expect(resp.status).to.eq(200)
    //     })

    // })

    it('Forget Password', () => {

        cy.contains('button', 'Forgot Password').click()

    })
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