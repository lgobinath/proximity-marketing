/*
 *  Copyright (c) 2015, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

var CONSTANTS = {
    urlSeperator: '/',
    queryParamStreamName: '?streamname=',
    queryParamStreamVersion: '&version=',
    queryParamLastUpdatedTime: '&lastUpdatedTime=',
    urlSecureTransportWebsocket: 'wss://',
    urlSecureTransportHttp: 'https://',
    colon: ':',
    defaultIntervalTime: 10 * 1000,
    defaultHostName: 'localhost',
    defaultSecurePortNumber: '9443',
    defaultMode: 'AUTO',
    processModeHTTP: 'HTTP',
    processModeWebSocket: 'WEBSOCKET',
    processModeAuto: 'AUTO',
    numThousand: 1000,
    websocketTimeAppender: 400,
    websocketSubscriptionEndpoint: 'portal/uipublisher/websocketSubscriptionEndpoint.jag',
    httpEventRetrievalEndpoint: 'portal/uipublisher/httpEventRetrievalEndpoint.jag'
};




function WebServiceClient() {
    this.websocket = null;
    this.webSocketUrl;
    this.httpUrl;
    this.cepHostName;
    this.cepPortNumber;
    this.isErrorOccured = false;
    this.lastUpdatedtime = -1;
    this.polingInterval;
    this.stream;
    this.streamVersion;
    this.firstPollingAttempt;
    this.processMode;
    this.onSuccessFunction;
    this.onErrorFunction;
    this.terminateWebsocketInstance = false;
    this.pollingContinue = true;
    /**
     * Gracefully increments the connection retry
     */
    this.waitTime = CONSTANTS.numThousand;
}

WebServiceClient.prototype = {
    /**
     * Initializing Web Socket
     */
    initializeWebSocket: function(webSocketUrl) {
        this.websocket = new WebSocket(webSocketUrl);

        /**
         * Web socket On Open
         */

        var $this = this;
        var webSocketOnOpen = function() {
            $this.websocket.send($this.stream + ":" + $this.streamVersion);
        };


        /**
         * On server sends a message
         */
        var webSocketOnMessage = function(evt) {
            var event = evt.data;
            var array = JSON.parse(event);
            $this.constructPayload(array);
        };

        /**
         * On server close
         */
        var webSocketOnClose = function(e) {

            if ($this.isErrorOccured) {
                if ($this.processMode != CONSTANTS.processModeWebSocket) {
                    $this.firstPollingAttempt = true;
                    $this.pollingContinue = true;
                    $this.startPoll();
                }
            } else {
                if (!$this.terminateWebsocketInstance) {
                    $this.waitForSocketConnection($this.websocket);
                } else {
                    $this.terminateWebsocketInstance = false;
                }

            }
        };

        /**
         * On server Error
         */
        var webSocketOnError = function(err) {
            var error = "Error: Cannot connect to Websocket URL:" + $this.webSocketUrl + " .Hence closing the connection!";

            $this.onErrorFunction(error);
            $this.isErrorOccured = true;

        };


        this.websocket.onopen = webSocketOnOpen;
        this.websocket.onmessage = webSocketOnMessage;
        this.websocket.onclose = webSocketOnClose;
        this.websocket.onerror = webSocketOnError;
    },

    waitForSocketConnection: function(socket, callback) {
        setTimeout(
            function() {
                if (socket.readyState === 1) {
                    this.initializeWebSocket(this.webSocketUrl);
                    console.log("Connection is made");
                    if (this.callback != null) {
                        this.callback();
                    }
                    return;
                } else {
                    try {
                        this.websocket = new WebSocket(this.webSocketUrl);
                        this.waitTime += CONSTANTS.this.websocketTimeAppender;
                        this.waitForSocketConnection(this.websocket, callback);
                    } catch (err) {
                        // do nothing
                    }
                }
            }, this.waitTime);
    },

    /**
     * Polling to retrieve events from http request periodically
     */
    startPoll: function() {

        (function poll() {
            setTimeout(function() {
                this.httpUrl = CONSTANTS.urlSecureTransportHttp + cepHostName + CONSTANTS.colon + cepPortNumber +
                    CONSTANTS.urlSeperator + CONSTANTS.httpEventRetrievalEndpoint + CONSTANTS.queryParamStreamName + this.stream +
                    CONSTANTS.queryParamStreamVersion + streamVersion + CONSTANTS.queryParamLastUpdatedTime + lastUpdatedtime;;
                $.getJSON(this.httpUrl, function(responseText) {
                        if (firstPollingAttempt) {
                            /*var data = $("textarea#idConsole").val();
                             $("textarea#idConsole").val(data + "Successfully connected to HTTP.");*/
                            this.firstPollingAttempt = false;
                        }
                        var eventList = $.parseJSON(responseText.events);
                        if (eventList.length != 0) {
                            this.lastUpdatedtime = responseText.lastEventTime;
                            for (var i = 0; i < eventList.length; i++) {
                                var arr = eventList[i];
                                this.constructPayload(arr);
                            }
                        }
                        if (pollingContinue) {
                            this.startPoll();
                        }
                    })
                    .fail(function(errorData) {
                        var errorData = JSON.parse(errorData.responseText);
                        this.onErrorFunction(errorData.error);
                    });
            }, this.polingInterval);
        })()
    },

    stopPollingProcesses: function() {

        //stopping the Websocket
        if (this.websocket != null) {
            this.terminateWebsocketInstance = true;
            this.websocket.close();
        }
        //stopping the HTTPS Request
        this.pollingContinue = false;

    },

    constructPayload: function(eventsArray) {

        var streamId = this.stream + CONSTANTS.colon + this.streamVersion;
        var twoDimentionalArray = [eventsArray];
        this.onSuccessFunction(streamId, twoDimentionalArray);

    },

    subscribe: function(streamName, version, intervalTime,
        listeningFuncSuccessData, listeningFuncErrorData, cepHost, cepPort, mode) {
        this.stopPollingProcesses();
        this.stream = streamName;
        this.streamVersion = version;
        this.onSuccessFunction = listeningFuncSuccessData;
        this.onErrorFunction = listeningFuncErrorData;

        if (intervalTime == null || this.intervalTime == "") {
            this.polingInterval = CONSTANTS.defaultIntervalTime;
        } else {
            this.polingInterval = intervalTime * CONSTANTS.numThousand;
        }

        if (cepHost == null || this.cepHost == "") {
            this.cepHostName = CONSTANTS.defaultHostName;
        } else {
            this.cepHostName = cepHost;
        }

        if (cepPort == null || cepPort == "") {
            this.cepPortNumber = CONSTANTS.defaultSecurePortNumber;
        } else {
            this.cepPortNumber = cepPort;
        }

        if (mode == null || mode == "") {
            this.processMode = CONSTANTS.defaultMode;
        } else {
            this.processMode = mode;
        }

        this.webSocketUrl = CONSTANTS.urlSecureTransportWebsocket + this.cepHostName + CONSTANTS.colon + this.cepPortNumber +
            CONSTANTS.urlSeperator + CONSTANTS.websocketSubscriptionEndpoint;

        if (this.processMode == CONSTANTS.processModeHTTP) {
            this.firstPollingAttempt = true;
            this.pollingContinue = true;
            this.startPoll();
        } else {
            this.initializeWebSocket(this.webSocketUrl);
        }
    }


};

var clients = {};

function subscribe(streamName, version, intervalTime, listeningFuncSuccessData, listeningFuncErrorData, cepHost, cepPort, mode) {
    var client = clients[streamName];
    if (!client) {
        client = clients[streamName] = new WebServiceClient();
    }
    client.subscribe(streamName, version, intervalTime, listeningFuncSuccessData, listeningFuncErrorData, cepHost, cepPort, mode);
}
