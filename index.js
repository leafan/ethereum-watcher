// *********************************
// Defining variables
// *********************************

const TelegramBot = require('node-telegram-bot-api');
const cron = require("node-cron");
const Web3 = require('web3');
const config = require('./config')
let fs = require("fs");

const telegramBotToken = config.TELE_BOT_TOKEN;

global.watchDB = {};
global.bot = new TelegramBot(telegramBotToken, {polling: true});
global.web3 = new Web3(config.PROVIDER);
global.WatchListFilePath = './watch_list.txt';
const WatchFn = require('./fn/watch')
const checkAllAddresses = require('./fn/check_all_addresses')
const logFn = require('./fn/log')
const {isExist,deleteChatID} = require('./utils/does_it_exist');
bot.on('polling_error', (error) => {
    console.log(error.message);  // => 'EFATAL'
});

// Telegram checking for commands w/o parameters
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === '/watch') {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /watch followed by a valid ETH address and memo like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa memo </code>', {parse_mode: "HTML"});
    }
    if (msg.text === "/forget") {
        bot.sendMessage(chatId, 'You need to specify an address.\nType /forget followed by an address you are watching currently, like this:\n<code>/forget 0xB91986a9854be250aC681f6737836945D7afF6Fa</code>', {parse_mode: "HTML"});
    }
});

// Telegram /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log('------------');
    bot.sendMessage(chatId, "***************\n\nHey there! I am a Telegram bot by @torsten1.\n\nI am here to watch Ethereum addresses. I will ping you if there's a change in balance. This is useful if you've just sent a transaction and want to be notified when it arrives. Due to API limitations, I can watch an address for no more than 24 hours.\n\n<b>Commands</b>\n\n* <code>/watch (address) (memo)</code> - start watching an address.\n* <code>/forget (address)</code> - stop watching an address.\n* <code>/list</code> - list the addresses you are watching.\n\nHave fun :)", {parse_mode: "HTML"});
});

// Telegram /watch command
bot.onText(/\/watch (.+) (.+)/, async (msg, match) => await WatchFn(msg, match));

// Telegram /forget command
bot.onText(/\/forget (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];


    if (isExist(chatId,ETHaddress)) {
        deleteChatID(chatId,ETHaddress);
        bot.sendMessage(chatId, `I stopped monitoring the address ${ETHaddress}.`);
    } else {
        bot.sendMessage(chatId, `I couldn't find the address ${ETHaddress} on the watchlist.`);

    }

});

// Telegram /list command
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    let nothingToList = true;
    let listOfAddresses = '';
    for (let key in watchDB) {
        let entry = watchDB[key];
        if (entry && entry.chatID.indexOf(chatId) !== -1) {
            nothingToList = false;
            listOfAddresses = listOfAddresses + `* ${entry.ETHaddress}` + `, ${entry.addressNote}\n`;
        }
    }

    if (nothingToList) {
        bot.sendMessage(chatId, `There are no addresses on your watchlist. Maybe time to add some!`);
    } else {
        bot.sendMessage(chatId, 'You are currently monitoring\n' + listOfAddresses);
    }
});

// Telegram /check command (not public)
bot.onText(/\/check/, (msg) => checkAllAddresses());


// function  watchAdd(ev){
//     const result = watchDB.filter(item => item.ETHaddress === ev.ETHaddress);
//     if(result.length === 0){
//         watchDB.push(ev);
//     }
// }


async function Main() {


    // setInterval(async ()=>{
    //     const latestBlockNumber = await web3.eth.getBlockNumber();
    //     if(current !== latestBlockNumber){
    //         current = latestBlockNumber;
    //         console.log(current);
    //         checkAllAddresses(current);
    //     }
    // },2000)
    // cron.schedule('*/1 * * * *', () => {
    //     checkAllAddresses();
    // });

    try {

        let data = await fs.readFileSync(WatchListFilePath, 'utf8');
        if(data)
        watchDB =  JSON.parse(data);
         logFn();
    } catch (e) {
        console.log(e);
        fs.writeFileSync(WatchListFilePath, '', 'utf8',)
    }

}


Main();
