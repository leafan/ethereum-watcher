const WatchEntry = require('./entry')
const isAddress = require('../utils/is_address')
const {getAddress,isExist} = require('../utils/does_it_exist')
let fs = require("fs");

module.exports = async (msg, match) => {
    const chatId = msg.chat.id;
    const ETHaddress = match[1];
    const addressNote = match[2];

    if (isAddress(ETHaddress)) {
        let balance = await web3.eth.getBalance(ETHaddress);
        let date = new Date();
        let timestamp = date.getTime();
        watchAdd(chatId, new WatchEntry([chatId], ETHaddress, balance, timestamp, addressNote))
        let balanceToDisplay = balance / 1e18;
        balanceToDisplay = balanceToDisplay.toFixed(4);
        bot.sendMessage(chatId, `Started watching the address ${ETHaddress}\nIt currently has ${balanceToDisplay} ETH.`);

    } else {
        bot.sendMessage(chatId, "This is not a valid ETH address.\nType /watch followed by a valid ETH address like this:\n<code>/watch 0xB91986a9854be250aC681f6737836945D7afF6Fa myAddress1</code>", {parse_mode: "HTML"});

    }
    fs.writeFileSync(WatchListFilePath, JSON.stringify(watchDB), 'utf8')

}


const watchAdd = (chatId, entry) => {
    let _key = getAddress(entry.ETHaddress);
    console.log( _key);
    if (!watchDB[_key]) {
        watchDB[_key] = entry;
    } else if (!isExist(chatId, _key)) {
        watchDB[_key].chatID.push(chatId);
    }
}
