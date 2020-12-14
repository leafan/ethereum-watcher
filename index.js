// *********************************
// Defining variables
// *********************************

const TelegramBot = require('node-telegram-bot-api');
const cron = require("node-cron");
const Web3 = require('web3');
const config = require('./config')
let fs = require("fs");


const web3 = new Web3(config.PROVIDER);

const telegramBotToken = config.TELE_BOT_TOKEN;
const bot = new TelegramBot(telegramBotToken, {polling: true});
const botOwner = config.BOTOWNER || '1187725682';
const WatchListFilePath = './watch_list.txt';

// Class to store addresses, previous balances and the Telegram chatID
class WatchEntry {
    constructor(chatID, ETHaddress, currentBalance, timeAddedToWatchlist, addressNote) {
        this.chatID = chatID;
        this.ETHaddress = ETHaddress;
        this.currentBalance = currentBalance;
        this.timeAddedToWatchlist = timeAddedToWatchlist;
        this.addressNote = addressNote;
    }
}

// Array to store WatchEntry objects
let watchDB = [];

// *********************************
// Helper functions
// *********************************

// Function to check if an address is a valid ETH address
var isAddress = function (address) {
    address = address.toLowerCase();
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
        return false;
    }
};

// *********************************
// Telegram bot event listeners
// *********************************

// Telegram error handling
bot.on('polling_error', (error) => {
    console.log(error.message);  // => 'EFATAL'
});

// Telegram checking for commands w/o parameters
bot.on('message', (msg) => {

    const chatId = msg.chat.id;
    if (msg.text === '/watch') {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>', {parse_mode: "HTML"});
    }
    if (msg.text === "/forget") {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /forget followed by an address you are watching currently, like this:\n<code>/forget 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>', {parse_mode: "HTML"});
    }
});

// Telegram /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "***************\n\nHey there! I am a Telegram bot by @torsten1.\n\nI am here to watch Ethereum addresses. I will ping you if there's a change in balance. This is useful if you've just sent a transaction and want to be notified when it arrives. Due to API limitations, I can watch an address for no more than 24 hours.\n\n<b>Commands</b>\n\n* <code>/watch (address)</code> - start watching an address.\n* <code>/forget (address)</code> - stop watching an address.\n* <code>/list</code> - list the addresses you are watching.\n\nHave fun :)", {parse_mode: "HTML"});
});

// Telegram /watch command
bot.onText(/\/watch (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];
    const addressNote = match[2];
    if (isAddress(ETHaddress)) {
        let balance = await web3.eth.getBalance(ETHaddress);
        let date = new Date();
        let timestamp = date.getTime();
        watchAdd(new WatchEntry(chatId, ETHaddress, balance, timestamp, addressNote))
        let balanceToDisplay = balance / 1e18;
        balanceToDisplay = balanceToDisplay.toFixed(4);
        bot.sendMessage(chatId, `Started watching the address ${ETHaddress}\nIt currently has ${balanceToDisplay} ETH.`);
        // Debug admin message for the bot owner
        //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone started watching the address\n${ETHaddress}\n`);
    } else {
        bot.sendMessage(chatId, "This is not a valid ETH address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa myAddress1</code>", {parse_mode: "HTML"});
        // Debug admin message for the bot owner
        //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone tried to watch an invalid address\n${ETHaddress}\n`);

    }
});
// Telegram /forget command
bot.onText(/\/forget (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];
    var newWatchDB = [];
    var nothingToForget = true;
    watchDB.forEach(function (entry) {
        if ((entry.chatID === chatId) && (entry.ETHaddress === ETHaddress)) {
            bot.sendMessage(chatId, `I stopped monitoring the address ${entry.ETHaddress}.`);
            // Debug admin message for the bot owner
            //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone stopped watching the address\n${ETHaddress}\n`);
            nothingToForget = false;
        } else {
            newWatchDB.push(entry);
        }
    });
    if (nothingToForget) {
        bot.sendMessage(chatId, `I couldn't find the address ${ETHaddress} on the watchlist.`);
        // Debug admin message for the bot owner
        //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone tried to remove this non-existing address from watchlist:\n${ETHaddress}\n`);
    }
    watchDB = newWatchDB;
});

// Telegram /list command
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    let nothingToList = true;
    let listOfAddresses = '';
    watchDB.forEach(function (entry) {
        if (entry.chatID === chatId) {
            nothingToList = false;
            listOfAddresses = listOfAddresses + `* ${entry.ETHaddress}` + `, ${entry.addressNote}\n`;
        }
    });
    if (nothingToList) {
        bot.sendMessage(chatId, `There are no addresses on your watchlist. Maybe time to add some!`);
    } else {
        bot.sendMessage(chatId, 'You are currently monitoring\n' + listOfAddresses);
    }
});

// Telegram /check command (not public)
bot.onText(/\/check/, (msg) => {
    // To manually trigger a check. For testing purposes.
    checkAllAddresses();
    // Debug admin message for the bot owner
    //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone called the /check function.`);
});

// *********************************
// Main functions
// *********************************

async function checkAllAddresses() {

    let debugNumberOfAlertsDelivered = 0;
    let newWatchDB = [];
    // using the for i structure because it's async
    for (let i = 0; i < watchDB.length; i++) {
        let entry = watchDB[i];
        // we check if the balance has changed
        const balance = await web3.eth.getBalance(entry.ETHaddress);
        if (balance === entry.currentBalance) {
            // no transfer
        } else {
            // there was a transfer
            let difference = (balance - entry.currentBalance) / 1e18;
            difference = difference.toFixed(4);
            let balanceToDisplay = balance / 1e18;
            balanceToDisplay = balanceToDisplay.toFixed(4);

            if (difference > 0) {
                //incoming transfer
                bot.sendMessage(entry.chatID, `address: ${entry.addressNote} incoming funds!\n\n${difference} ETH arrived to the address "https://cn.etherscan.com/address/${entry.ETHaddress}" since I've last checked.\nCurrent balance is ${balanceToDisplay} ETH.`);
            } else {
                //outgoing transfer
                bot.sendMessage(entry.chatID, `address: ${entry.addressNote} flying out funds!\n\n${difference} ETH left the address "https://cn.etherscan.com/address/${entry.ETHaddress}" since I've last checked.\nCurrent balance is ${balanceToDisplay} ETH.`);
            }
            // debug
            debugNumberOfAlertsDelivered = debugNumberOfAlertsDelivered + 1;
        }
        // if the entry is too old, we get rid of it
        let date = new Date();
        let now = date.getTime();
        const newEntry = new WatchEntry(entry.chatID, entry.ETHaddress, balance, entry.timeAddedToWatchlist, entry.addressNote);

        newWatchDB.push(newEntry);
    }
    watchDB = newWatchDB;
    fs.writeFileSync(WatchListFilePath,JSON.stringify(watchDB),'utf8')

    if (debugNumberOfAlertsDelivered > 0) {
        //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nNumber of notifications delivered: ${debugNumberOfAlertsDelivered}`);
        debugNumberOfAlertsDelivered = 0;
    }
}

function  watchAdd(ev){
    const result = watchDB.filter(item => item.ETHaddress === ev.ETHaddress);
    if(result.length === 0){
        watchDB.push(ev);
    }
}


async function Main() {
    cron.schedule('*/1 * * * *', () => {

        checkAllAddresses();
    });

    try {
        //bot.sendMessage(botOwner, `--> ADMIN MESSAGE\nSomeone called the /check function.`);

        let data = await fs.readFileSync(WatchListFilePath, 'utf8');
        watchDB = JSON.parse(data);

    } catch (e) {

        fs.writeFileSync(WatchListFilePath, '', 'utf8',)
    }

}


Main();
