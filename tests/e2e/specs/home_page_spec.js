describe('The Home Page', function() {
    beforeEach(() => {
        cy.visit('http://localhost:8080')
    });

    const userEmail = 'test@1.com'

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
        /*check if status equal 401 after Incorrect values  */

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'tests@1.com', password: 'tests' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(401)
        })
        cy.contains('button', 'Forgot Password').click()
        cy.get('#forgetPass')
            .type(userEmail)
        cy.get('.forgetPass').click()

    })

    it('Login Fails Data ', () => { /*check if status equal 400 after Incorrect email address  */

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'tests1.com', password: 'tests' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(400)
        })

    })

    it('Login Sucess', () => { /*check if status equal 200 after Correct values  */

        cy.contains('button', 'Login').click()

        cy.typeLogin({ email: 'test@1.com', password: 'test' })

        cy.PostLogin()

        cy.get('@postUser').should((resp) => {
            expect(resp.status).to.eq(200)
        })


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