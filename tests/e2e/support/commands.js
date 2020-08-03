const { MailSlurp } = require('mailslurp-client');

// set your api key with an environment variable CYPRESS_API_KEY
// (cypress prefixes environment variables with CYPRESS)

//const apiKey = Cypress.env('MAIL_API_KEY')
const apiKey = '984b32571f793f885a302808a6934e150eb2f13d817ab0a9c2a0b5948f5568d0';
const mailslurp = new MailSlurp({ apiKey });

Cypress.Commands.add("createInbox", () => {
    return mailslurp.createInbox();
});

Cypress.Commands.add("waitForLatestEmail", (inboxId) => {
    return mailslurp.waitForLatestEmail(inboxId, 10000)
});

Cypress.Commands.add("waitForMatchingEmails", (inboxId, matches) => {
    return mailslurp.waitForMatchingEmails(matches, 1, inboxId, 10000)
});


Cypress.Commands.add("getEmail", (emailId) => {
    return mailslurp.getEmail(emailId)
});