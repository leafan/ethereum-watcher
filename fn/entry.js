
// Class to store addresses, previous balances and the Telegram chatID
module.exports = class WatchEntry {
    constructor(chatID, ETHaddress, currentBalance, timeAddedToWatchlist, addressNote) {
        this.chatID = chatID;
        this.ETHaddress = ETHaddress;
        this.currentBalance = currentBalance;
        this.timeAddedToWatchlist = timeAddedToWatchlist;
        this.addressNote = addressNote;
    }
}
