module.exports = {
    createKey: (id,address)=>{
        return id+":"+address;
    },
    isMyself: (id,address) =>{
        let _key = this.createKey(id,address);
        return watchDB[_key] && watchDB[this.createKey(id,address)].chatID === id;
    },

}


