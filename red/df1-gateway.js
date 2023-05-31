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

        const configNode = RED.nodes.getNode(config.endpoint);
        if (!configNode) {
            return this.error(RED._("df1.error.missingconfig"));
        }
        
        const server = new Gateway({productName: config.nameGateway})
        let df1 = null;
        let that = this;
        let serverClosed = true;
        let _reconnectTimeout = null;

        function connect() {

            if (_reconnectTimeout !== null) {
                clearTimeout(_reconnectTimeout);
                _reconnectTimeout = null;
            };

            df1 = configNode.df1Endpoint();

            if(df1){
                df1.on('connected', () => registerSession());
                df1.on('error', () => unRegisterSession());
                df1.on('timeout', () => unRegisterSession());
                df1.on('disconnect', () => onDisconnect());
            }else{
                onDisconnect();
            }
        }

        function onDisconnect() {
            if(df1 !== null){
                df1.removeListener('connected',registerSession);
                df1.removeListener('error',unRegisterSession);
                df1.removeListener('timeout',unRegisterSession);
                df1.removeListener('disconnect',onDisconnect);

                unRegisterSession();

                df1 = null;
            };

            if (!_reconnectTimeout) {
                _reconnectTimeout = setTimeout(connect, 5000);
            };
            
        }

        function getDf1Session{
            const df1protocol = df1.df1Protocol;
            if(df1protocol) return df1protocol.dataLinkSession;
        }

        function registerSession() {
            const session = getDf1Session();
            if(session) server.registerDf1(session);
        };

        function unRegisterSession() {
            const session = getDf1Session();
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

        connect();
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
