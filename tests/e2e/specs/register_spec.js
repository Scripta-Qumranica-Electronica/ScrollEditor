describe('Register new User', function() {
    beforeEach(() => {
        cy.visit('/')
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

    const password = "test";
    let inboxId;
    let emailAddress;
    let forename;
    let surname;
    it('generate a new email address and sign up', function() {

        cy.contains('button', 'Register').click();
        cy.createInbox().then(inbox => {
            // verify a new inbox was created
            assert.isDefined(inbox)

            // save the inboxId for later checking the emails
            inboxId = inbox.id
            emailAddress = inbox.emailAddress;
            forename = 'shaindel';
            surname = 'enriquez';
            // sign up with inbox email address and the password
            cy.get('input[name=forename]').type(forename);
            cy.get('input[name=surname]').type(surname);
            cy.get('input[type=email]').type(emailAddress);
            cy.get('input[name=password]').type(password);
            cy.get('input[name=repassword]').type(password);

            cy.get('.btn-register').click();
        });
    });

    it('can receive the confirmation email', () => {
        // wait for an email in the inbox
        cy.waitForLatestEmail(inboxId).then(email => {
            // verify we received an email
            assert.isDefined(email);
            cy.log(email.body)
                // verify that email contains the code
            assert.strictEqual(/Thank you for registering/.test(email.body), true);

            // // extract the confirmation link (so we can confirm the user)
            link = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g.exec(email.body)[2];
            cy.log(link);
            cy.visit(link);
            cy.get('.btn-activate').click();
            cy.typeLogin({ email: 'test@1.com', password: 'test' })

            cy.PostLogin()

            cy.get('@postUser').should((resp) => {
                expect(resp.status).to.eq(200)
            })

            cy.get('ul>li.list-item>.card').contains('1QS990').first()
                .click({ multiple: true })
            cy.get('.btn-permission').click();
            cy.wait(2500)

            cy.get('#invitations-list').then((list) => {
                debugger
                const invitationsCount1 = list[0].children.length;

                cy.debug(invitationsCount1);
                cy.get('input[type=email]').type(emailAddress);
                cy.get('#inline-form-custom-select-pref').select('Write');
                cy.get('.btn-invite').click();
                cy.wait(2500)
                cy.get('#invitations-list').then((resp) => {
                    debugger
                    const invitationsCount2 = resp[0].children.length;

                    expect(invitationsCount2).to.be.greaterThan(invitationsCount1);
                });

            })

            cy.waitForMatchingEmails(inboxId, {
                matches: [{
                    field: "SUBJECT",
                    should: "CONTAIN",
                    value: "Invitation to"
                }]
            }).then(mails => {
                assert.isDefined(mails);
                cy.getEmail(mails[0].id).then(
                    mail => {
                        assert.isDefined(mail);
                        cy.log(mail.body)
                            // verify that email contains the code
                            // assert.strictEqual(/Thank you for registering/.test(email.body), true);

                        // // extract the confirmation link (so we can confirm the user)
                        link = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g.exec(mail.body)[2];
                        cy.log(link);
                        cy.get('.close').click()
                        cy.get('#register').click()
                        cy.get('ul>li.logout:nth-child(1)').click()

                        cy.contains('button', 'Login').click()
                        cy.typeLogin({ email: emailAddress, password: 'test' })
                        cy.PostLogin()
                        cy.wait(2500)
                        cy.visit(link);
                        cy.get('.btn-confirm').click()


                        cy.get('@postUser').should((resp) => {
                            expect(resp.status).to.eq(200)
                        })
                        cy.get('ul>li.list-item>.card').contains('1QS990').first().should(() => {
                            expect('.fa-users').to.exist
                        })
                    }
                );
            })
        });


    });



});

//     it('can receive the confirmation email2', () => {
//         // wait for an email in the inbox


//     // it('check value of  list invitation', () => {
//     //     cy.get('ul>li.list-item>.card').contains('1QS990').first()
//     //         .click({ multiple: true })
//     //     cy.get('.btn-permission').click();

//     // });


// })