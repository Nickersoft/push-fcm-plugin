/**
 * Push FCM Plugin
 * ===============
 * The official Firebase Cloud Messaging plugin for Push.js
 *
 * License
 * -------
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2017 Tyler Nickerson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of self software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and self permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @preserve
 */

var ERR_NO_LOCAL_STORAGE = "localStorage not available. Cannot record whether or not tokens are sent to the server.";
var ERR_NO_FIREBASE = "Firebase could not be found. Did you run \"npm install firebase --save\"?";
var ERR_NO_PUSH = "Push.js v1.0 is required to run this plugin in the browser. Please install it and include it in this page.";
var ERR_SW_FAILED = "Could not register the ServiceWorker due to the following error: ";
var ERR_SW_NOT_SUPPORTED = "Your current environment does not support ServiceWorkers. FCM may not work as expected.";
var SENT_TO_SERVER_KEY = "PushFCM_sentToServer";
var INITIALIZED_KEY = "PushFCM_initialized";

function getRoot() {
    return (typeof self == 'object' && self.self === self && self) ||
        (typeof global == 'object' && global.global === global && global);
}

(function (factory) {

    'use strict';

    var root = getRoot();

    /* Use AMD */
    if (typeof define === 'function' && define.amd) {
        define(['firebase'], function (firebase) {
            return factory(root, firebase);
        });
    }
    /* Use CommonJS */
    else if (typeof module !== 'undefined' && module.exports) {
        var firebase = require('firebase/app');
        require('firebase/messaging');
        module.exports = factory(root, firebase)();
    }
    /* Use Browser */
    else {
        if (typeof root.Push === 'undefined' || root.Push === null)
            console.error(ERR_NO_PUSH);
        else
            root.Push.extend(factory(root, root.firebase));
    }

})(function (root, firebase, Push) {

    var configuration = {
        FCM: {
            apiKey: null,
            authDomain: null,
            databaseURL: null,
            projectId: null,
            storageBucket: null,
            messagingSenderId: null,
            serviceWorkerLocation: './',
            onTokenFetched: function (token) {
            },
            onTokenFetchedError: function (error) {
            },
            onPermissionRequired: function (token) {
            },
            onPermissionGranted: function (token) {
            },
            onPermissionDenied: function (token) {
            },
            onMessage: function (payload) {
            },
            sendTokenToServer: function (token) {
            },
            onTokenDeleted: function () {
            },
            onTokenDeletedError: function () {
            }
        }
    };

    var FCMPlugin = function (config) {
        var self = this;
        var initialized = false;

        if (typeof firebase === 'undefined' || firebase === null)
            console.error(ERR_NO_FIREBASE)

        self._messaging = null;

        /*****************
         Private Functions
         *****************/

        /**
         * Returns a boolean denoting whether Firebase has already initialized
         */
        function isInitialized() {
            return firebase.apps.length > 0;
        }

        /**
         * Sets a stored boolean denoting whether sendTokenToServer() has been called
         * @param sent
         */
        function setTokenSentToServer(sent) {
            if (root.hasOwnProperty("localStorage")) root.localStorage.setItem(SENT_TO_SERVER_KEY, sent ? 1 : 0);
            else console.error(ERR_NO_LOCAL_STORAGE);
        }

        /**
         * Returns a boolean denoting whether the latest Instance ID has been sent to the server
         * @returns {boolean}
         */
        function isTokenSentToServer() {
            if (root.hasOwnProperty("localStorage")) return root.localStorage.getItem(SENT_TO_SERVER_KEY) == 1;
            else console.error(ERR_NO_LOCAL_STORAGE);
            return false;
        }

        /**
         * Wrapped method that calls sendTokenToServer() and sets the boolean accordingly
         * @param token
         */
        function sendTokenToServer(token) {
            if (!isTokenSentToServer()) {
                config.FCM.sendTokenToServer(token);
                setTokenSentToServer(true);
            }
        }

        /**
         * Attempts to fetch the Instance ID and will request permission if it can't obtain it
         */
        function fetchToken() {
            getToken()
                .then(function (token) {
                    setTokenSentToServer(false);

                    if (token) {
                        sendTokenToServer(token);
                        config.FCM.onTokenFetched(token);
                    } else {
                        config.FCM.onPermissionRequired();
                        requestPermission();
                    }
                })
                .catch(function (error) {
                    setTokenSentToServer(false);
                    config.FCM.onTokenFetchedError(error);
                });
        }

        /**
         * Requests permission to obtain instance ID token
         */
        function requestPermission() {
            self._messaging.requestPermission()
                .then(function () {
                    config.FCM.onPermissionGranted();
                    fetchToken();
                })
                .catch(function (error) {
                    config.FCM.onPermissionDenied(error)
                });
        }

        /**
         * Deletes the current Instance ID token
         */
        function deleteToken() {
            return new Promise(function (fulfill, reject) {
                getToken()
                    .then(function (currentToken) {
                        self._messaging.deleteToken(currentToken)
                            .then(function () {
                                setTokenSentToServer(false);
                                config.FCM.onTokenDeleted();
                                fulfill(currentToken);
                            })
                            .catch(function (error) {
                                config.FCM.onTokenDeletedError(error);
                                reject(error);
                            });
                    })
                    .catch(function (error) {
                        config.FCM.onTokenFetchedError(error);
                        reject(error);
                    });
            });
        }

        /**
         * Returns the current Instance ID token if it exists
         * @returns {Promise}
         */
        function getToken() {
            return new Promise(function (fulfill, reject) {
                self._messaging.getToken()
                    .then(function (token) {
                        fulfill(token);
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            });
        }

        /**
         * Initializes Firebase using a given ServiceWorker registration
         * @param functions FCM functions to resolve the promise with
         * @returns {Promise}
         */
        function initialize(functions) {
            return new Promise(function(fulfill, reject) {
                var localConfig, initConfig, initialized, swLocation;

                localConfig = config.FCM;

                initConfig = {
                    apiKey: localConfig.apiKey,
                    authDomain: localConfig.authDomain,
                    databaseURL: localConfig.databaseURL,
                    projectId: localConfig.projectId,
                    storageBucket: localConfig.storageBucket,
                    messagingSenderId: localConfig.messagingSenderId
                };

                initialized = isInitialized();

                if (!initialized)
                    firebase.initializeApp(initConfig);
                else
                    console.info("Firebase could not be initialized. It may be because Firebase an app is already initialized.");

                self._messaging = firebase.messaging();

                swLocation = localConfig.serviceWorkerLocation;

                // Add a trailing slash if one is missing
                if (swLocation[swLocation.length - 1] !== '/')
                    swLocation += '/';

                if (!initialized) {
                    if (root.navigator !== 'undefined' && 'serviceWorker' in root.navigator) {
                        root.navigator.serviceWorker.register(swLocation + 'firebase-messaging-sw.min.js', {scope: './'})
                            .then(function () {
                                return navigator.serviceWorker.ready;
                            })
                            .then(function (registration) {
                                if (self._messaging != null && self._messaging !== 'undefined') {
                                    var messageChannel = new MessageChannel();

                                    messageChannel.port1.onmessage = function () {
                                        self._messaging.useServiceWorker(registration);
                                        self._messaging.onTokenRefresh(fetchToken);
                                        self._messaging.onMessage(config.FCM.onMessage);

                                        fetchToken();

                                        console.debug("Received heartbeat from ServiceWorker.");
                                        console.debug("Messaging instance initialized with value:");
                                        console.debug(self._messaging);

                                        fulfill(functions);
                                    };

                                    registration.active.postMessage(initConfig, [messageChannel.port2]);
                                }
                            }).catch(function (error) {
                                reject(error);
                            }
                        );
                    } else {
                        reject(new Error(ERR_SW_NOT_SUPPORTED));
                        return {};
                    }
                }
            });
        }

        /**
         * Initialization method of the FCM plugin.
         * Should be the first thing called.
         * @constructor
         * @return {Promise}
         */
        self.FCM = function () {
            var failed = false;

            for (var k in config.FCM) {
                if (config.FCM[k] == null) {
                    console.error("Null values exists for config value: " + k + ". Please make sure all values " +
                        "are set properly in Push.config().FCM before continuing."
                    )

                    failed = true;
                }
            }

            if (!failed)
                return initialize({
                    getToken: getToken,
                    deleteToken: deleteToken,
                    isTokenSentToServer: isTokenSentToServer
                });

            return null;
        }
    }

    return {
        config: configuration,
        plugin: FCMPlugin
    };
});
