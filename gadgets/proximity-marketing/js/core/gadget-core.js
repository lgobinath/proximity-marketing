/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var gadgetLocation;
var pref = new gadgets.Prefs();
var CHART_CONF = 'chart-conf';
var PROVIDER_CONF = 'provider-conf';

var alertConf;
var alertSchema;

var locationConf;
var locationSchema;

var refreshInterval;
var providerData;
var REFRESH_INTERVAL = 'refreshInterval';

var init = function() {

    // Alert
    alertConf = {
        "provider-conf": {
            "provider-name": "realtime",
            "streamName": "org.wso2.realtime.analytics.stream.Alert:1.0.0"
        }
    };
    $.ajax({
        url: gadgetLocation + '/gadget-controller.jag?action=getSchema',
        method: "POST",
        data: JSON.stringify(alertConf),
        contentType: "application/json",
        async: false,
        success: function(data) {
            alertSchema = data;
        }
    });

    // Location
    locationConf = {
        "provider-conf": {
            "provider-name": "realtime",
            "streamName": "org.wso2.realtime.analytics.stream.PeopleLocation:1.0.0"
        }
    };
    $.ajax({
        url: gadgetLocation + '/gadget-controller.jag?action=getSchema',
        method: "POST",
        data: JSON.stringify(locationConf),
        contentType: "application/json",
        async: false,
        success: function(data) {
            locationSchema = data;
        }
    });
};

var getItemDetails = function(floorNumber) {
    itemConf = {
        "provider-conf": {
            "db_url": "jdbc:mysql://localhost:3306/realtime_analytics_beacon",
            "password": "root",
            "provider-name": "rdbms",
            "query": "SELECT name, shelfNumber FROM ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_ITEM WHERE floorNumber = " + floorNumber,
            "table_name": "ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_ITEM",
            "username": "root"
        }
    };

    $.ajax({
        url: gadgetLocation + '/gadget-controller.jag?action=getData',
        method: "POST",
        data: JSON.stringify(itemConf),
        contentType: "application/json",
        async: false,
        success: function(data) {
            providerData = data;
        }
    });
    return providerData;
}

var getPeopleHistory = function(query) {
    historyConf = {
        "provider-conf": {
            "db_url": "jdbc:mysql://localhost:3306/realtime_analytics_beacon",
            "password": "root",
            "provider-name": "rdbms",
            "query": query,
            "table_name": "ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_PEOPLE",
            "username": "root"
        }
    };

    $.ajax({
        url: gadgetLocation + '/gadget-controller.jag?action=getData',
        method: "POST",
        data: JSON.stringify(historyConf),
        contentType: "application/json",
        async: false,
        success: function(data) {
            providerData = data;
        }
    });
    return providerData;
}

var getPeopleLocationHistoryOnDay = function(floorNumber, year, month, day) {
    //var query = "SELECT * FROM ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_PEOPLE WHERE floorNumber = " + floorNumber + " AND year = " + year + " AND month = " + month + " AND day = " + day + " AND hour = " + hour + " AND minute = " + minute;
    var query = "SELECT * FROM ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_PEOPLE WHERE floorNumber = " + floorNumber;
    return getPeopleHistory(query);
};

var getPeopleLocationHistoryOnMinute = function(floorNumber, year, month, day, hour, minute) {
    year = 2016;
    month = 11;
    day = 3;
    hour = 10;
    var query = "SELECT * FROM ORG_WSO2_REALTIME_ANALYTICS_EVENT_TABLE_PEOPLE WHERE floorNumber = " + floorNumber + " AND year = " + year + " AND month = " + month + " AND day = " + day + " AND hour = " + hour + " AND minute = " + minute;
    return getPeopleHistory(query);
};



var drawGadget = function() {

    registerCallBackforPush(alertConf[PROVIDER_CONF], alertSchema, function(streamId, providerData) {
        for (i = 0; i < providerData.length; i++) {
            var alertDetail = providerData[i];
            // showAlert (type, title, message)
            showAlert(alertDetail[1], alertDetail[2], alertDetail[3]);
        }
    });

    registerCallBackforPush(locationConf[PROVIDER_CONF], locationSchema, function(streamId, providerData) {
        setCurrentCustomerLocations(providerData);
    });
};

$(function() {
    getGadgetLocation(function(gadget_Location) {
        gadgetLocation = gadget_Location;
        init();
        drawGadget();

    });
});
