module.exports = {


    'The Home Page': function(browser) {
        beforeEach(() => {
            browser.url('http://localhost:8080');
            token = '';
        });

        function typeLogin(user) {
            browser.setValue('input[type=email]', user.email)
                .setValue('input[type=password]', user.password)

        }

        function PostLogin(expectedResponse) {
            browser.waitForXHR('/v1/users/login', 2000, function browserTrigger() {
                browser.click('button[type=submit]');
            }, function assertValues(xhrs) {
                // browser.assert.equal(xhrs[0].status, "success");
                // browser.assert.equal(xhrs[0].method, "POST");
                // browser.assert.equal(xhrs[0].requestData, expectedResponse);
                if (expectedResponse === '200') {
                    browser.assert.elementPresent("#register__BV_button_");
                } else {
                    browser.assert.equal(xhrs[0].httpResponseCode, expectedResponse);
                }


                // browser.assert.equal(xhrs[0].responseData, "");
            });
        }

        it('Login Fails', () => {
            /*check if status equal 401 after Incorrect values  */
            browser.click('.navbar-nav .nav-item>a>button')
            typeLogin({ email: 'tests@1.com', password: 'tests' })
            PostLogin("401")

            //     .click('Forgot Password')
            // browser.waitForElementVisible('#forgetPass').type(userEmail)
            //     .click('.forgetPass')

        })
        it('Login Fails Data ', () => { /*check if status equal 400 after Incorrect email address  */
            browser.click('.navbar-nav .nav-item>a>button')
            typeLogin({ email: 'tests1.com', password: 'tests' })
            PostLogin("400")
        })
        it('Login Sucess', () => { /*check if status equal 200 after Correct values  */
            browser.click('.navbar-nav .nav-item>a>button')
            typeLogin({ email: 'test@1.com', password: 'test' })
            PostLogin("200")
        })

    }


};