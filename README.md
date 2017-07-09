# Push.js FCM Plugin

## What is FCM?
FCM, otherwise known as Firebase Cloud Messaging, is a free feature of the Google Firebase Platform, a collection of services for building scalable, effective web services. FCM allows web servers to send direct messages to a group of subscribers using ServiceWorkers. This means that by using this plugin, Push.js can now send targeted push notifications to a user's desktop without your website being open! Finally! :tada::tada::tada:

Though, keep in mind this is the first plugin for Push.js, ever. Expect a few bumps and potholes.

## Installing
Just like Push itself, this module is easily installable via NPM or Bower:

```bash
$ npm install push-fcm-plugin --save
$ bower install push-fcm-plugin --save 
```

## How to Use
### Configuring
With Push.js, managing FCM on your site becomes incredibly easy. To begin, you need to configure FCM Push's SafeConfig: Head on over to your [Firebase console](https://console.firebase.google.com/) and add a new project. Once the project is created, click on it and then click "Add Firebase to your web app". Select the configuration map from the generated code in the popup window and add it to your JavaScript file. Then, add the map to Push's FCM configuration using the `config()` method. Your finally code should look something like this:

```javascript
var config = {
    apiKey: "<YOUR_API_KEY>",
    authDomain: "<YOUR_AUTH_DOMAIN>",
    databaseURL: "<YOUR_DATABASE_URL>",
    projectId: "<YOUR_PROJECT_ID>",
    storageBucket: "<YOUR_STORAGE_BUCKET>",
    messagingSenderId: "<YOUR_MESSAGE_SENDER_ID>"
};

Push.config({
    FCM: config
});
```

Lastly, add a `manifest.json` file to the root of your web server with the following contents:
  
```json
{
    "//": "Some browsers will use this to enable push notifications.",
    "//": "It is the same for all projects, this is not your project's sender ID",
    "gcm_sender_id": "103953800507"
}
```

then import it into your HTML:

```html
<link rel="manifest" href="/manifest.json">
```

This sender ID is required in order to tell Firebase your website allows messages to be pushed to it. **Do not change the above ID.** It is the same for all Firebase projects, regardless of who you are or what you've built. 

### Using with AMD or CommonJS
If you use AMD or CommonJS to load Push, you'll have to manually install the plugin. 

For AMD:

```javascript
define(['push', 'pushjs-fcm'], function (Push, PushFCM) {
    Push.extend(PushFCM);
});
```

For CommonJS:

```javascript
const Push = require('pushjs');
const PushFCM = require('pushjs-fcm');

Push.extend(PushFCM);
```

### Initializing
To initialize FCM, just call:

```javascript
Push.FCM();
```

And that's it! You can then use the returned promise to run additional functions:

```javascript
Push.FCM().then(function(FCM) {
    FCM.getToken().then(function(token) {
        console.log("Initialized with token " + token);
    }).catch(function(tokenError) {
       throw tokenError; 
    });
}).catch(function(initError) {
   throw initError; 
});
```

The available functions are as follows:


| Function                | Description                                                                                                         | Returns                      |
|-------------------------|---------------------------------------------------------------------------------------------------------------------|------------------------------|
| `getToken()`            | generates a new Instance ID token or retrieves the current one if it already exists                                 | Promise(token, error)        |
| `deleteToken()`         | deletes the current token                                                                                           | Promise(deletedToken, error) |
| `isTokenSentToServer()` | denotes whether the current token has been sent to the server via `sendTokenToServer()`  (see "Additional Options") | Boolean                      |

### Additional Options
The FCM SafeConfig has a few additional options you can pass to it:

- `serviceWorkerLocation`: Specifies directory containing the `firebase-messaging-sw` ServiceWorker script. May need to
change if Push has been installed via NPM or Bower. The default is `./`.
- `onTokenFetched(token)`: Called when a new Instance ID token is retrieved
- `onTokenFetchedError(error)`: Called if an error occurs while retrieving a new Instance ID token
- `onPermissionRequired()` Called when permission is required to retrieve an Instance ID
- `onPermissionGranted()`: Called when said permission is granted
- `onPermissionDenied()`: Called when said permission is denied
- `onMessage(payload)`: Called when a new message is received
- `sendTokenToServer(token)`: Function that sends the given token to your server for future use 
- `onTokenDeleted(deletedToken)`: Called when the current token is deleted
- `onTokenDeletedError(error)`: Called if an error occurs while deleting the current token

### Sending Server-side Notifications
To send a notification to a given Instance ID from your server, simply make a POST request to `https://fcm.googleapis.com/fcm/send` with the following data:

Header
```text
Authorization: key=<YOUR_SERVER_KEY>
Content-Type: application/json
```

Body
```json
{ 
  "notification": {
    "title": "Notification Title",
    "body": "Notification Body",
    "click_action" : "http://example.com"
  },
  "to" : "<INSTANCE_ID_TOKEN>"
}
```

You can find your server key by going to your project console on Firebase, clicking the gear icon on the right sidebar, selecting "Project Settings" and going to the "Cloud Messaging" tab. For more information on messaging types, read Google's [documentation on the topic](https://firebase.google.com/docs/cloud-messaging/concept-options#notifications).

### Writing Your Own Plugin
Documentation on writing plugins will be coming the official Push.js docs soon!