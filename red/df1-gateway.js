try {
    var Gateway = require('@protocols/node-df1-gateway').gatewayConnect
} catch (error) {
    var Gateway = null;
}


module.exports = function (RED) {
    function df1Gateway(config) {
        RED.nodes.createNode(this,config);
        
        this.on('close',() => {
            if (serverClosed == false) {
                closeServer();
            };
        });
        
        if (!Gateway) return this.error('Missing "@protocols/node-df1-gateway" dependency, avaliable only on the ST-One hardware. Please contact us at "st-one.io" for pricing and more information.') 

        this.df1 = RED.nodes.getNode(config.endpoint);
        if (!this.df1) {
            return this.error(RED._("df1.error.missingconfig"));
        }
        
        const server = new Gateway({productName: config.nameGateway})
        const df1 = this.df1.df1Endpoint()
        let that = this;
        let serverClosed = true;
        
        df1.on('connected', () => registerSession());
        df1.on('error', () => unRegisterSession());
        df1.on('timeout', () => unRegisterSession());

        this.getDf1Session  = () => {
            const df1protocol = df1.df1Protocol;
            if(df1protocol) return df1protocol.dataLinkSession;
        }

        function registerSession() {
            const session = this.getDf1Session();
            if(session) server.registerDf1(session);
        };

        function unRegisterSession() {
            const session = this.getDf1Session();
            if(session) server.unRegisterDf1(session);
        };

        server.on('error',(err) => {
            if (serverClosed == false) {
                closeServer();
            };
        });

        server.on('connection',(conn) => {   
            that.status(manageStatus('online',conn));
        });

        server.on('open', () => {
            serverClosed = false;
            that.status(manageStatus('online',0));
        });

        if(serverClosed == true) {
            server.open();
        };

        function closeServer(){
            serverClosed = true;

            server.unRegisterAllDf1();

            server.on('close', () => {
                that.status(manageStatus('offline',0));
            });
            server.close();
        };
    };

    function manageStatus(status,conn) {
        let obj;

        switch(status){
            case 'online':{
                obj = {
                    fill: 'green',
                    shape: 'dot',
                    text: 'Conn: '+conn
                };
                break;
            };
            case 'offline':{
                obj = {
                    fill: 'red',
                    shape: 'dot',
                    text: 'Conn: '+conn
                };
                break;
            };
        };
        return obj;
    };

    RED.nodes.registerType('df1 gateway', df1Gateway);
}
