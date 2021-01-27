const BN = require("bn.js");
const {getAddress,toAddress} = require('../utils/does_it_exist')
const Abi = require('../abi/erc20.json');
module.exports = function () {

    web3.eth.subscribe('logs', {
        // address: '0x7302509251F3bdA6428365bAe08206D4C3D3173C',
        topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
             // '0x0000000000000000000000007302509251F3bdA6428365bAe08206D4C3D3173C',
        ],
    }, function (error, result) {
    })
        .on("connected", function (subscriptionId) {
             console.log(subscriptionId, 'connectedID');
        })
        .on("data", async (log) => {

            let _form = getAddress(log.topics[1])
            let _to = getAddress(log.topics[2]);
            console.log(_form,_to);
            if (watchDB[_to] || watchDB[_form]) {
                sendFn(!watchDB[_form], watchDB[_to] || watchDB[_form], log)
            }
        })
        .on("changed", function (log) {
            console.log(log, '----<<<<<<<<<<<<<<changed----');
        }).on('error', (err) => {
        console.log(err, 'err---------');
    });
}


let timeout = null;
let last = '';
let transactionData = {}
const sendFn = (isForm, entry, data) => {


    if (timeout !== null && last === data.transactionHash) {
        clearTimeout(timeout);
    }
    last = data.transactionHash
    transactionData[last] = [...(transactionData[last] || []), data]
    timeout = setTimeout(async () => {

        let _contract =  new web3.eth.Contract(Abi.abi,  data.address);

        let _name = await _contract.methods.symbol().call();
        let _decimals = await _contract.methods.decimals().call();
        let _textTmp = '';
        transactionData[data.transactionHash].forEach((item, index) => {
            let _topics = item.topics;
            _textTmp += `\n${toAddress(_topics[1])} ---> ${toAddress(_topics[2])} 
            \n amount: ${item.data/Math.pow(10,_decimals)} ${_name} \n------------------------------------------
            `;
        })

        entry.chatID.forEach((chatID) => {
            bot.sendMessage(chatID, `address: ${entry.addressNote} ${isForm ? 'incoming funds!' : 'flying out funds!'}
            ${_textTmp}
            \nETH arrived to the address "https://etherscan.io/tx/${data.transactionHash}" since I've last checked.
            `);
        });
        delete transactionData[data.transactionHash];
    }, 100);
    // console.log(data);
    // entry.chatID.forEach((chatID)=>{
    //     bot.sendMessage(chatID, `address: ${entry.addressNote} ${isForm?'incoming funds!':'flying out funds!'}
    //     \n${data.data} ETH arrived to the address "https://etherscan.io/tx/${data.transactionHash}" since I've last checked.`);
    // })
}

