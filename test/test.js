/**
 * Created by JiaHao on 18/8/15.
 */

var async = require('async');
var chai = require('chai');
var assert = chai.assert;
var validUrl = require('valid-url');

var base = require('./../lib/base');
var Revenant = require('./../lib/Revenant');

const testUrls = ['http://apple.com', 'http://skewedlines.github.io/ajax-test-page/'];
const AJAX_URL = testUrls[1];
const INVALID_URL = 'http://insdasjdlkas.com/';

describe('Testing base PhantomJS functions', function () {
    this.timeout(50000);
    it('Can open pages', function (done) {

        async.each(testUrls, function (testUrl, callback) {
            base.openPage(testUrl, function (error, page, ph) {
                ph.exit();
                callback(error);
            });
        }, function (error) {
            assert.notOk(error, 'No error should be received when opening pages');
            done(error);
        });
    });

    it('Can fail to open pages gracefully', function (done) {

        base.openPage(INVALID_URL, function (error, page, ph) {
            ph.exit();
            assert.ok(error, 'An error should be received when opening pages');
            done();
        });
    });
});

describe('Testing Revenant Object', function () {
    this.timeout(30000);

    describe('Basic tasks', function () {

        it('Can open pages (Node style callback)', function (done) {
            async.each(testUrls, function (testUrl, callback) {

                var browser = new Revenant();
                browser.openPage(testUrl, function (error) {
                    browser.done();

                    assert.isTrue(!!validUrl.isWebUri(browser.url), 'Current url of the page is saved to the object');

                    callback(error);
                });

            }, function (error) {
                assert.notOk(error, 'No error should be received when opening a valid page.');
                done(error);
            });
        });

        it('Can do tasks sequentially and get a snapshot', function (done) {
            var browser = new Revenant();
            var url = testUrls[0];
            browser
                .openPage(url)
                .then(function () {
                    return browser.takeSnapshot();
                })
                .then(function (result) {
                    assert.include(result, '</html>', 'Snapshot results contain closing </html> tag');
                    browser.done();
                    done();
                }).fail(function (error) {
                    browser.done();
                    done(error);
                });
        });

        it('Can wait for an element to appear and can get the innerHTML of the element', function (done) {
            var browser = new Revenant();
            var url = AJAX_URL;

            const SELECTOR = '#setTimeoutContent';
            browser
                .openPage(url)
                .then(function () {
                    return browser.waitForElement(SELECTOR);
                })
                .then(function () {
                    return browser.getInnerHTML(SELECTOR);
                })
                .then(function (result) {
                    assert.equal(result, 'BUBBLES', 'Awaited element innerHTML should be "BUBBLES"');
                    browser.done();
                    done();
                }).fail(function (error) {
                    browser.done();
                    done(error);
                });
        });

        it('Can fill a form and query a form for its value', function (done) {
            var browser = new Revenant();
            var url = AJAX_URL;

            const USERNAME_SELECTOR = '#form-username';
            const PASSWORD_SELECTOR = '#form-password';

            const USERNAME = 'user123';

            browser
                .openPage(url)
                .then(function () {
                    return browser.fillForm(USERNAME_SELECTOR, USERNAME);
                })
                .then(function () {
                    return browser.getSelectorValue(USERNAME_SELECTOR);
                }).then(function (result) {
                    assert.equal(result, USERNAME, 'Username should be equal to filled value');
                    browser.done();
                    done();
                }).fail(function (error) {
                    done(error);
                });
        });

        it('Can pass flags into the PhantomJS process', function (done) {

            // We use a URL which will return an ssl handshake error, and we try to pass a flag that ignores that

            var SSL_HANDSHAKE_ERROR_URL = 'https://myportal.sutd.edu.sg/';

            var browser = new Revenant({
                flags: ['--ignore-ssl-errors=yes']
            });

            browser
                .openPage(SSL_HANDSHAKE_ERROR_URL)
                .then(function () {
                    return browser.takeSnapshot();
                })
                .then(function (result) {
                    assert.ok(result, 'A proper result should be returned, as the ssl error handshake error should have been ignored');
                    browser.done();
                    done();
                }).fail(function (error) {
                    browser.done();
                    done(error);
                });
        });

    });

    describe('Graceful failures', function () {

        describe('Error triggers if a page is not open', function () {

            it('Node style callback', function (done) {
                var browser = new Revenant();

                browser.takeSnapshot(function (error) {
                    browser.done();
                    assert.ok(error, 'Error should say that a page is not open');
                    done();
                });
            });

            it('Promise', function (done) {
                var browser = new Revenant();

                browser
                    .takeSnapshot()
                    .then(function (result) {
                        done('Error: Result callback should not be called, it is invalid');
                    }).fail(function (error) {
                        browser.done();
                        assert.ok(error, 'Error should say that a page is not open');
                        done();
                    });
            });
        });

        it('Promise Should propagate errors', function (done) {
            var browser = new Revenant();

            // provide an invalid url, error should be sent in the callback at .openPage();
            var url = null;

            browser
                .openPage(url)
                .then(function () {
                    return browser.takeSnapshot();
                })
                .then(function (result) {
                    browser.done();
                    done('Error callback should have been triggered, not this.');
                }).fail(function (error) {
                    browser.done();
                    assert.ok(error, 'Error should say that an invalid url is provided');
                    done();
                }).fail(function (error) {
                    // this will be reached if an exception is thrown in the callback for .fail()
                    // as there are issues when throwing synchronous errors in the final callback
                    done(error);
                });
        });
    });

});