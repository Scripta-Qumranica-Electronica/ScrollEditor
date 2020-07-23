//     'Demo test ecosia.org': function(browser) {
//         browser
//             .url('https://www.ecosia.org/')
//             .waitForElementVisible('body')
//             .assert.titleContains('Ecosia')
//             .assert.visible('input[type=search]')
//             .setValue('input[type=search]', 'nightwatch')
//             .assert.visible('button[type=submit]')
//             .click('button[type=submit]')
//             .assert.containsText('.mainline-results', 'Nightwatch.js')
//             .end();
//     }

module.exports = {
    'Select language': function(browser) {
        beforeEach(() => {
            browser.url('http://localhost:8080')
        });
        it('English', function() {
            browser.waitForElementVisible('#language')
                .click('#language a')
                .waitForElementVisible('ul>li.select-lang:nth-child(1)')
                .assert.containsText('ul>li.select-lang:nth-child(1)>button', 'English')
                .click('ul>li.select-lang:nth-child(1)>button')
                .expect.element('label.filter').text.to.contain('Filter Editions:')
        })
        it('Francais', function() {
            browser.waitForElementVisible('#language')
                .click('#language a')
                .waitForElementVisible('ul>li.select-lang:nth-child(2)')
                .assert.containsText('ul>li.select-lang:nth-child(2)>button', 'Français')
                .click('ul>li.select-lang:nth-child(2)>button')
                .expect.element('label.filter').text.to.contain('Filtre d\'éditions')

        });
    }


};