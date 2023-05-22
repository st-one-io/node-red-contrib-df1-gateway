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

        node.df1 = RED.nodes.getNode(config.df1);
        if (!node.df1) {
            return node.error(RED._("df1.error.missingconfig"));
        }
        
        const server = new Gateway({productName: config.nameGateway})
        const endpoint = RED.nodes.getNode(config.endpoint);
        let that = this;
        let serverClosed = true;
        
        endpoint.on('connected', () => {
            const session = endpoint.getDf1Session()
            if(session) registerSession(session);
        });

        endpoint.on('error', () => {
            const session = endpoint.getDf1Session();
            if(session) unRegisterSession(session);
        });

        endpoint.on('timeout', () => {
            const session = endpoint.getDf1Session();
            if(session) unRegisterSession(session);
        })


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

        function registerSession(df1) {
            server.registerDf1(df1);
        };

        function unRegisterSession(df1) {
            server.unRegisterDf1(df1);
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
