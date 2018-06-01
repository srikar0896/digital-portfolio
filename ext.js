new (function (mExtension) {
    var socket = null;
    var connected = false;
    var extStatus = 1; // Status to send in getstatus
    var extMsg = 'Not Ready'; // Message to send in getstatus
    var analogData = [];
    var digitalData = [];
    var removedUltraSonic = false;
    var receivedMotionData = false;
    var isDetected = false;
    var botIp = "10.42.0.138";
    var streaming_ip = "0.0.0.0";
    var streaming = false;
    var remoteData = [];
    var remotePollHandler = '';
    var remoteDataKeyMap = {
        'left' : 0,
        'right': 1,
        'up'   : 2,
        'down' : 3
    };
    const remote = require('electron').remote;
    const BrowserWindow = remote.BrowserWindow;
    // TODO:write corresponding function for ultra sonic,touch,camera

    var pollSensorsData = function () {
        $.get("http://0.0.0.0:5000/sensors/get", function (data, status) {
            data = JSON.parse(data);
            analogData = data['analogData'];
            digitalData = data['digitalData'];
            console.log(data);
        });
    };
    var startRemoteDataPolling = function () {
        $.get("http://10.42.0.214/getRemoteData", function (data, status) {
            data = JSON.parse(data).remoteData;
            remoteData = data;
            console.log(remoteData);
        });
    };
    String.prototype.format = function () {
        a = this;
        for (k in arguments) {
            a = a.replace("{" + k + "}", arguments[k])
        }
        return a
    };
    var startSensorPolling = function(){
        var sensorPollHandler = setInterval(function(){
            pollSensorsData();
        },1000);
    };
    mExtension.cnct = function (callback) {
        $.get("http://0.0.0.0:5000/test", function (data, status) {
            if(data == 'ok'){
                startSensorPolling();
                connected = true;
                extStatus = 2;
                extMsg = 'ready';
                callback();
            }
        });
    };

    mExtension._shutdown = function () {
        clearInterval(sensorPollHandler);
    };

    mExtension.connectToRemote = function () {
        remotePollHandler = setInterval(function () {
            startRemoteDataPolling();
        }, 1000);
    };
    mExtension.disconnectFromRemote = function () {
        console.log('disconnecting from remote');
        clearInterval(remotePollHandler);
    };
    // write for disconnect => which clears the interval.
    mExtension._getStatus = function (status, msg) {
        return { status: extStatus, msg: extMsg };
    };
    var isValidSpeed = function (speed) {
        if (speed > 0 && speed < 101) {
            return true;
        } else {
            alert('speed can only be betwenn 0 - 100');
            return false;
        }
    };
    mExtension.indMotor = function (motor, direction, speed) {
        if (connected    == false) {
            alert("Server Not Connected");
        } else {
            if (isValidSpeed(speed)) {
                $.get("http://0.0.0.0:5000/motors/set/{0}/{1}/{2}".format(motor,speed,direction));
            }
        }
    };
    mExtension.startStreaming = function(){
        // Streaming in modal.
        // let win = new remote.BrowserWindow({
        //     parent: remote.getCurrentWindow(),
        //     modal: true
        // })
        // var theUrl = 'http://'+ streamingIp +':5000/';
        // win.loadURL(theUrl);
        // callback();

        // In app Streaming DOM manipulation.
        if(streaming){
            console.log('Removing');
            streaming = false;
            var myNode = document.getElementById("streaming-container");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }
        }else{
            var streaming_src = "http://0.0.0.0:5000/video_feed";
            const isReachable = require('is-reachable');
            var streaming_img = document.createElement('img');
            streaming_img.setAttribute('id', 'streaming_img');
            streaming_img.setAttribute('src', streaming_src);
            document.getElementById("streaming-container").appendChild(streaming_img);
        }
    };
    mExtension.stopMotor = function (motor) {
        if (connected == false) {
            alert("Server Not Connected");
        } else {
            var msg = JSON.stringify({
                "command": 'stopMotor', 'motor': motor
            });
            console.log(msg);
            removedUltraSonic = true;
            // descriptorJSON.menus.motor.push("new motor");
            // window.ScratchExtensions.unregister('NE Bot');
            // window.ScratchExtensions.register('NE Bot', descriptorJSON, mExtension);

            window.socket.send(msg);
        }
    };

    mExtension.analogValue = function (channel) {
        if (connected == false) {
            alert("Server Not Connected");
        } else {
            return analogData[parseInt(channel)]; //return from global varibale
        }
    };

    mExtension.digitalValue = function (channel) {
        if (connected == false) {
            alert("Server Not Connected");
        } else {
            s= digitalData[parseInt(channel)]; //return from global varibale
		if(s==0){
			return false;
		}else{
			return true;
        }
        }
    };

    mExtension.bothMotor = function (direction, speed) {
        if (connected == false) {
            alert("Server Not Connected");
        } else {
            var msg = JSON.stringify({
                "command": 'bothMotor', 'direction': direction, 'speed': speed
            });
            console.log(msg);
            if (isValidSpeed(speed)) {
                window.socket.send(msg);
            }
        }
    };

    mExtension.whenAnalogValue = function (channel, op, value) {
        var x = false
        if (op == '>') {
            x = analogData[parseInt(channel)] > value
        }
        if (op == '<') {
            x = analogData[parseInt(channel)] < value
        }
        if (op == '=') {
            x = (analogData[parseInt(channel)] === value)
        }
        console.log(x);
        return true;
    };
    mExtension.whenRemoteKeyPressed = function(key){
        // console.log(remoteData[remoteDataKeyMap[key]] == 1);
        console.log(key);
        return true;
    };
    mExtension.whendigitalChannel = function (channel, dsignal) {
        var signalMap = {
            'ON': 1,
            'OFF': 0
        };
        return (digitalData[parseInt(channel)] == signalMap[dsignal]);
    };
    mExtension.motionDetected = function () {
        return (21);
    };
    mExtension.whenUltraSonicValue = function(op,val){
        return (true);
    };

    //Describe the blocks
    var descriptorJSON = {
        blocks: [
            ['h', 'Program Mode', 'programMode'],
            ["w", "Connect to server", "cnct"],
            [" ", "Toggle Camera", "startStreaming"],
            [" ", "Connect to Remote", "connectToRemote"],
            [" ", "Disonnect from Remote", "disconnectFromRemote"],
            ['h', 'when Digital channel %m.channel is %m.onOff ', 'whendigitalChannel', "0", 'ON'],
            ['h', 'when Analog channel %m.channel %m.lessMore %n', 'whenAnalogValue', "0", '>', 50],
            ['h', 'when Ultrasonic channel %m.channel %m.lessMore %n', 'whenUltraSonicValue', "0", '>', 50],
            ['h', 'when %m.remoteKeys key is pressed in remote', 'whenRemoteKeyPressed','left'],
            ['r', 'amount of motion detected', 'motionDetected'],
            ['b', 'is touch sensor pressed?', 'isTouchSensorPressed'],
            [" ", "Move %m.motor port in %m.direction with %n speed", "indMotor", "PortA", "forward", 100],
            [" ", "print %s in console", "printMessage", "test message"],
            [" ", "Stop %m.motor", "stopMotor", "PortA"],
            ["r", "Get value of %m.channel analog channel", "analogValue", "0"],
            ["b", "Get value of %m.channel digital channel", "digitalValue", "0"],
            // [" ", "Move both motors in %m.fDirections with %n speed", "bothMotor", "forward", 100]
        ],
        "menus": {
            "direction": ["forward", "backward"],
            "motor": ["PortA", "PortB", "PortC", "PortD"],
            "sensor": ['analog', 'digital', 'ultraSonic','touch'],
            "remoteKeys":['left','right','up','down'],
            "lessMore": ['>', '<', '='],
            "channel": ["0", "1", "2", "3"],
            "onOff": ['ON', 'OFF'],
            "fDirections": ["forward", "backward", "left", "right"]
        }
    };
    //Register the extension in the end
    window.ScratchExtensions.register('NE Bot', descriptorJSON, mExtension);
})({});
