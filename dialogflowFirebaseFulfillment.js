const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const { Firestore } = require("@google-cloud/firestore");
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "credentials.json";
 
const db = new Firestore();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
      agent.add("Hello! I am your virtual assistant for the bank. How can I help you today?");
    }

    function fallback(agent) {
      agent.add("I didn't understand");
      agent.add("I'm sorry, can you try again?");
    }

    function check_balance(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("Sorry! I could not find your account.");
          } else {
            var balance = doc.data().balance;
            agent.add(
              `Thank You for the information! The current balance in your bank account is Rupees ${balance}.`
            );
          }
          return Promise.resolve();
        })
        .catch((error) => {
          console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    function transaction_history(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("Sorry! I could not find your account.");
          } else {
            let last_transaction = doc.data().last_transaction;
            const date = last_transaction.toDate().toDateString();
            const time = last_transaction.toDate().toLocaleTimeString("en-US");

            agent.add(
              `Thank for the information! The last transaction from you account happened on ${date} at ${time}`
            );
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    function deposit_money(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("I could not find your account.");
          } else {
            var current_balance = doc.data().balance;
            var to_deposit = agent.parameters.amount;
            var t = firebase.firestore.Timestamp.fromDate(new Date());
            db.collection("bank_accounts")
              .doc(id)
              .update({
                balance: current_balance + to_deposit,
                last_transaction: t,
              })
              .catch((error) => {
                console.log("Transaction failure:", error);                
                return Promise.reject();
              });

            var bal = current_balance + to_deposit;
            agent.add(
              `Thank You for the information. The amount has been added to your account. The current balance in your account is Rupees ${bal}`
            );
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }
    function withdraw_money(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("I could not find your account.");
          } else if (doc.data().balance < agent.parameters.amount) {
            agent.add(
              "Sorry, you do not have sufficient balance in your account to complete this withdrawal."
            );
          } else {
            var current_balance = doc.data().balance;
            var to_withdraw = agent.parameters.amount;
            // var t = firebase.firestore.Timestamp.fromDate(new Date());

            db.collection("bank_accounts")
              .doc(id)
              .update({
                balance: current_balance - to_withdraw,
                // last_transaction: t
              })
              .catch((error) => {                
                console.log("Transaction failure:", error);
                return Promise.reject();
              });

            var bal = current_balance - to_withdraw;
            agent.add(
              `Thank You for the information. The amount has been debited from your account. The current balance in your account is Rupees ${bal}`
            );
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    function reset_pin(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("I could not find your account.");
          } else if (doc.data().pin != agent.parameters.old_pin) {
            agent.add(
              "Sorry, this does not match the existing pin. You cannot proceed forward."
            );
          } else {
            var new_pin = agent.parameters.new_pin;

            db.collection("bank_accounts")
              .doc(id)
              .update({
                pin: new_pin,
              })
              .catch((error) => {
                console.log("Transaction failure:", error);
                return Promise.reject();
              });

            agent.add("Thank you, your pin has been successfully changed.");
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    function bill_payment_electricity(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("I could not find your account.");
          }
          else   if(doc.data().electricity_bill == 0){
            agent.add(
              "Your electricity bill has already been paid for the month."
            );
          } 
          else if (doc.data().balance < doc.data().electricity_bill) {
            agent.add(
              "Sorry, you do not have sufficinet balance in your account to make the payment."
            );
          } 
          else {

            var current_balance = doc.data().balance;
            var elec_bill = doc.data().electricity_bill;

            var new_balance = current_balance-elec_bill;

            db.collection("bank_accounts").doc(id).update({
                electricity_bill: 0,
                balance:new_balance,
              })
              .catch((error) => {
                console.log("Transaction failure:", error);
                return Promise.reject();
              });

            agent.add(`Thank you, your electricity bill for the month has been paid. The current balance in your account is rupees ${new_balance}`);
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    function create_account(agent) {
      let fname = agent.parameters.fname;
      let lname = agent.parameters.lname;
      let pan_no = agent.parameters.pan_no;
      let balance = 0;
      let latest_transaction_ts = Date.now();

      db.collection("bank_accounts").add({
        fname: fname,
        lname: lname,
        pan_no: pan_no,
        balance: balance,
        last_transaction: latest_transaction_ts,
      });

      agent.add(
        `Thank You ${fname}, your account has been successfully created and will be available for use after the KYC.`
      );
    }

    function delete_account(agent) {
      let id = agent.parameters.account_id.toString();
      let collectionRef = db.collection("bank_accounts");
      let userDoc = collectionRef.doc(id);
      return userDoc
        .get()
        .then((doc) => {
          if (!doc.exists) {
            agent.add("I could not find your account.");
          } else {
            db.collection("bank_accounts").delete();

            agent.add(
              "Thanks for the information, your bank account has been successfully deleted."
            );
          }
          return Promise.resolve();
        })
        .catch((error) => {
           console.log(error);
          agent.add("Error reading entry from the Firestore database.");
        });
    }

    // db.collection("bank_accounts").delete();

    let intentMap = new Map();
    intentMap.set("Default Fallback Intent", fallback);
    intentMap.set("Default Welcome Intent", welcome);
    intentMap.set("check-balance-get-id", check_balance);
    intentMap.set("transaction-history-get-id", transaction_history);
    intentMap.set("deposit-money-get-id", deposit_money);
    intentMap.set("withdraw-money-get-id", withdraw_money);
    intentMap.set("create-account-get-details", create_account);
    intentMap.set("reset-pin-get-id", reset_pin);
    intentMap.set("delete-account-get-id", delete_account);
    intentMap.set("bill-payment-electricity-get-id", bill_payment_electricity);
    agent.handleRequest(intentMap);
});