let fs = require("fs");
const WatchEntry = require('./entry')
module.exports = async function checkAllAddresses(blockNumber) {
    let debugNumberOfAlertsDelivered = 0;
    let newWatchDB = [];

    // await getBlockData(blockNumber);
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
        debugNumberOfAlertsDelivered = 0;
    }
}


// async function getBlockData(blockNumber){
//
//     let data = await web3.eth.getBlock(23081228 );
//     web3.eth.getBlockTransactionCount()
//      console.log(data);
//
// }
