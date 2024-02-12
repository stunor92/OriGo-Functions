/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {logger} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const functions = require('firebase-functions');


initializeApp();

exports.removePersonFromUser = onCall({enforceAppCheck: true,},async (request) => {
    const documentId = request.data.documentId;
    const userId = request.auth.uid;

    await removeUserFromPersonDocument(documentId, userId);

});

exports.removeAllPersonsForUser = functions.auth.user().onDelete(async (user) => {
    const snapshot = await getFirestore().collection("persons")
    .where("users", 'array-contains', user.uid)
    .get();

    if (snapshot.empty) {
        console.log('No matching documents.');
        return;
    }  

    snapshot.forEach(doc => {
        removeUserFromPersonDocument(doc.id, user.uid);
    });
});

async function removeUserFromPersonDocument(documentId, userId) {
    const docRef = getFirestore().collection("persons").doc(documentId);

    const doc = await docRef.get();

    if (!doc.exists) {
        throw new functions.https.HttpsError('not-found', 'No such document!');
    } else {
        const users = doc.data().users;
        if (!users) {
        throw new functions.https.HttpsError('failed-precondition', 'No users field in document');
        }

        if (users.includes(userId)) {
            users.splice(users.indexOf(userId), 1);
            console.log('User is removed from person');

        } else {
            console.log('User not found in document');
        }

        await docRef.update({ users: users });
        await deletePersonIfUsersIsEmpty(documentId);
        return { message: 'User removed from document' };
    }
}

async function deletePersonIfUsersIsEmpty(docId) {
  const docRef = getFirestore().collection('persons').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
        console.log('No such document!');
    } else {
        if (doc.data().users.length === 0) {
            await docRef.delete();
            console.log('Document deleted because array was empty');
        } else {
            console.log('Array is not empty or does not exist');
        }
    }
}

