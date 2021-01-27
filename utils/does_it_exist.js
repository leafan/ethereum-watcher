let fs = require("fs");
module.exports = {
    getAddress:(address) => getAddress(address),
    toAddress:(address) => toAddress(address),
    isExist: (id, address) => {
        address = getAddress(address, 24)
        let _entry = watchDB[address];
        return _entry.chatID.indexOf(id) !== -1;
    },
    deleteChatID: (id, address) => {
        address = getAddress(address, 24)
        let _entry = watchDB[address];
        let _i = _entry.chatID.indexOf(id);
        if (_i === -1) {
            return;
        }
        _entry.chatID.splice(_i, 1);
        if (!_entry.chatID.length) {
            delete watchDB[address];
        }
        fs.writeFileSync(WatchListFilePath, JSON.stringify(watchDB), 'utf8')

    }
}

const  getAddress =  (address) => {
    return web3.utils.padLeft(address.toLowerCase(), 64);
};

const  toAddress =  (address) => {
    return web3.utils.numberToHex(address.toLowerCase());
};
