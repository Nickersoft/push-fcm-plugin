self.addEventListener('message', function (event) {
    importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-app.js');
    importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-messaging.js');

    var messaging;

    firebase.initializeApp(event.data);

    messaging = firebase.messaging();
    messaging.setBackgroundMessageHandler(function (payload) {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);

        var notificationTitle = payload.title || '';
        var notificationOptions = {
            body: payload.body || '',
            icon: payload.icon || ''
        };

        return self.registration.showNotification(notificationTitle,
            notificationOptions);
    });

    event.ports[0].postMessage(event.data);
});