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

 CELL_SIZE = 50;

/**
 * Flag indicating whether to show the realtime people.
 */
var showCurrent = true;

/**
 * Flag indicating whether to show the heatmap.
 */
var showHeatMap = false;

/**
 * Flag indicating whether to show the history.
 */
var showHistory = false;

/**
 * Store the current customer locations on each floor.
 */
var currentCustomerLocations = {};

/**
 * Keeps the currentliy selected floor id.
 */
var currentFloor = 1;

/**
 * Total number of floors in the supermarket.
 */
var noOfFloors = 1;

/**
 * Currently selected minute in the slider.
 */
var currentMinute = 0;

var currentFloorItems = {};

var peopleInFloor = [];

function FloorMap(canvas, cfg) {

    // Properties
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.matrix = undefined;
    this.round = 0;
    this.icons = []
    this.personIcons = []
    this.drawnCustomers = []
    this.max = 3;

    // Merge of the default and delivered config.
    var defaults = {
        cellsX: 25,
        cellsY: 25,
        rules: "23/3",
        gridColor: "#F8F8F8",
        cellColor: "#ccc"
    };
    this.cfg = $.extend({}, defaults, cfg);

    // Initialize the canvas and matrix.
    this.init();
}

function Cell(x, y, shelfNumber, customerName) {
    this.x = x;
    this.y = y;
    this.shelfNumber = shelfNumber;
    this.customers = [customerName];
}

function CustomerLocation(x, y, shelfNumber, customerName, iconIndex) {
    this.x = x;
    this.y = y;
    this.shelfNumber = shelfNumber;
    this.customerName = customerName;
    this.iconIndex = iconIndex;
}

FloorMap.prototype = {
    init: function() {
        // Load user icons
        var customerIcon = new Image();
        customerIcon.src = "/portal/store/carbon.super/fs/gadget/proximity-marketing/img/customer.png";
        this.personIcons.push(customerIcon);

        var staffIcon = new Image();
        staffIcon.src = "/portal/store/carbon.super/fs/gadget/proximity-marketing/img/staff.png";
        this.personIcons.push(staffIcon);
    },

    load: function(id) {
        this.icons = []
        this.drawnCustomers = []
        var $this = this;
        $.getJSON("/portal/store/carbon.super/fs/gadget/proximity-marketing/data/floor_" + id + ".json", function(json) {
            $this.cfg.cellsX = json.width;
            $this.cfg.cellsY = json.height;
            $this.canvas.width = $this.cfg.cellsX * CELL_SIZE;
            $this.canvas.height = $this.cfg.cellsY * CELL_SIZE;

            // Transpose the array to get the same view
            $this.matrix = new Array(json.width)

            for (i = 0; i < json.width; i++) {
                var row = new Array(json.height);
                for (j = 0; j < json.height; j++) {
                    row[j] = -1;
                }
                $this.matrix[i] = row;
            }

            for (i = 0; i < json.map.length; i++) {
                for (j = 0; j < json.map[i].length; j++) {
                    $this.matrix[j][i] = json.map[i][j];
                }
            }

            for (var i = 0; i < json.icons.length; i++) {
                var img = new Image();
                img.src = "/portal/store/carbon.super/fs/gadget/proximity-marketing/" + json.icons[i];
                $this.icons.push(img);
            }

            $this.draw();
        });

    },

    /**
     * Draws the entire floor on the canvas.
     */
    draw: function() {
        var x, y;

        // Reset drawn customer cache whenever drawing new data
        this.drawnCustomers = []

        // clear canvas and set colors
        this.canvas.width = this.canvas.width;
        this.ctx.strokeStyle = this.cfg.gridColor;
        this.ctx.fillStyle = this.cfg.cellColor;

        // draw matrix
        for (x = 0; x < this.matrix.length; x++) {
            for (y = 0; y < this.matrix[x].length; y++) {
                if (this.matrix[x][y] == -1) {
                    // Do nothing
                } else if (this.matrix[x][y] == 0) {
                    this.ctx.fillStyle = this.cfg.gridColor;
                    this.ctx.fillRect(x * CELL_SIZE + 1,
                        y * CELL_SIZE + 1,
                        CELL_SIZE,
                        CELL_SIZE);
                } else {
                    this.ctx.fillStyle = this.cfg.cellColor;
                    this.ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE, CELL_SIZE);

                    var cx = x * CELL_SIZE + Math.round(CELL_SIZE / 2) - 16;
                    var cy = y * CELL_SIZE + Math.round(CELL_SIZE / 2) - 16;

                    if (this.matrix[x][y] > 1) {
                        this.ctx.drawImage(this.icons[this.matrix[x][y] - 2], cx, cy);
                    }
                }
            }
        }
    },

    drawHeatMap: function(data) {
        var heat = simpleheat(this.canvas);
        heat.radius(25, 45);
        heat.data(data);
        heat.max(this.max);
        heat.draw(0.5);
    },

    drawUser: function(location) {
        var next_customer = false;

        var x = location.x;
        var y = location.y;

        var customerLocation;
        for (i = 0; i < this.drawnCustomers.length; i++) {
            customerLocation = this.drawnCustomers[i];
            if (customerLocation.x == x && customerLocation.y == y) {
                next_customer = true;
                break;
            }
        }

        if (!next_customer) {
            var cx = x * CELL_SIZE + Math.round(CELL_SIZE / 2) - 5 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            var cy = y * CELL_SIZE + Math.round(CELL_SIZE / 2) - 20 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            this.ctx.drawImage(this.personIcons[location.iconIndex], cx, cy);
            this.drawnCustomers.push(new Cell(x, y, location.shelfNumber, location.customerName));
        } else {
            var cx = x * CELL_SIZE + Math.round(CELL_SIZE / 2) - 5 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            var cy = y * CELL_SIZE + Math.round(CELL_SIZE / 2) - 20 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            this.ctx.drawImage(this.personIcons[location.iconIndex], cx, cy);
            customerLocation.customers.push(location.customerName);
        }
    },

    /**
     * Generate a random distance to draw multiple customers in a single cell so that the icons do not hide
     * previously drawn icons.
     */
    randomDeviate: function() {
        var deviate = 0;
        while (deviate == 0) {
            deviate = Math.round(Math.random() * 30) - 15;
        }
        return deviate;
    },

    /**
     * Show the information about customers available at the clicked cell.
     */
    showNotification: function(x, y) {
        loadFlorItems(currentFloor);
        var shelfNumber = y * 15 + x;
        if (x >= 0 && x < this.matrix.length && y >= 0 && y < this.matrix[0].length) {
            var title;
            if (currentFloorItems[currentFloor] && currentFloorItems[currentFloor][shelfNumber]) {
                // console.log(currentFloorItems[currentFloor][shelfNumber]);
                title = 'List of people looking at ' + currentFloorItems[currentFloor][shelfNumber];
            } else {
                title = 'List of people wating here'
            }
            var description = '';
            for (var i = 0; i < this.drawnCustomers.length; i++) {
                if (this.drawnCustomers[i].x == x && this.drawnCustomers[i].y == y) {
                    // title = this.drawnCustomers[i].itemName;
                    for (j = 0; j < this.drawnCustomers[i].customers.length; j++) {
                        description += this.drawnCustomers[i].customers[j] + '<br>';
                    }

                    // Show notification
                    $('#customerModal').find('#customerModalLabel').html(title);
                    $('#customerModal').find('#customerModalContent').html(description);
                    $('#customerModal').modal('show');
                    break;
                }
            }
        }
    }
};


/**
 * The object representing a single floor.
 */
var floor = new FloorMap(document.getElementById("floor"));


/**
 * This method identifies the clicked cell based on the relative position of the canvas
 * on the screen and call the showNotification method to show any information associated
 * with clicked cell.
 */
floor.canvas.addEventListener("click", function(e) {
    var x;
    var y;

    // Get the mouse clicked position on the screen
    if (e.pageX !== undefined && e.pageY !== undefined) {
        x = e.pageX;
        y = e.pageY;
    } else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    // Convert the position relative to the canvas
    var rect = floor.canvas.getBoundingClientRect();
    y -= floor.canvas.offsetTop + CELL_SIZE;
    x -= rect.left;
    x = Math.floor(x / CELL_SIZE);
    y = Math.floor(y / CELL_SIZE);

    // Ask the floor to show notification related to this cell.
    floor.showNotification(x, y);
}, false);

/**
 * This method is called by the Floor lists displayed on the right side of the gadget.
 * The on-click binding is defined in index.html.
 */
var loadFloor = function(floorNumber) {
    floor.load(floorNumber);
    currentFloor = floorNumber;
    if (showHeatMap) {
        loadHeatMap(floorNumber);
    } else if (showHistory) {
        currentMinute = timeSlider.bootstrapSlider('getValue');
        loadHistory(floorNumber, currentMinute);
    }
};

var loadHeatMap = function(floorNumber) {
    floor.draw();

    loadFlorItems(floorNumber);

    var currentTime = new Date();

    // Show history
    var events = getPeopleLocationHistoryOnDay(floorNumber, currentTime.getFullYear(), currentTime.getMonth() + 1, currentTime.getDate());

    var shelfFrequency = [];
    var itemFrequency = [];
    var cells = [];
    var data = [];
    var popularItem = '';
    var maxFreq = 0;
    var noOfStaffs = 0;
    var noOfCustomers = 0;

    for (i = 0; i < events.length; i++) {
        var event = events[i];
        var id = event.ID;
        var shelfNumber = event.SHELFNUMBER;

        var itemName;
        var isCustomer = !id.toLowerCase().startsWith("s");
        if (currentFloorItems[floorNumber][shelfNumber]) {
            itemName = currentFloorItems[floorNumber][shelfNumber];
        }
        if (isCustomer) {
            noOfCustomers++;
        } else {
            noOfStaffs++;
        }

        if (shelfFrequency[shelfNumber]) {
            shelfFrequency[shelfNumber]++;
        } else {
            shelfFrequency[shelfNumber] = 1;
            cells.push(shelfNumber);
        }

        if (itemName && isCustomer) {
            if (itemFrequency[itemName]) {
                itemFrequency[itemName]++;
            } else {
                itemFrequency[itemName] = 1;
            }
            if (maxFreq < itemFrequency[itemName]) {
                popularItem = itemName;
                maxFreq = itemFrequency[itemName]
            }
        }
    }

    for (i = 0; i < cells.length; i++) {
        var shelfNumber = cells[i];
        var x = shelfNumber % 15;
        var y = (shelfNumber - x) / 15;

        var cx = x * CELL_SIZE + Math.round(CELL_SIZE / 2) - 70;
        var cy = y * CELL_SIZE + Math.round(CELL_SIZE / 2) - 70;

        var freq = 0;
        if (shelfFrequency[shelfNumber]) {
            freq = shelfFrequency[shelfNumber];
        }
        data.push([cx, cy, freq]);
    }
    showFloorDetail(floorNumber, noOfCustomers, noOfStaffs, popularItem);
    floor.drawHeatMap(data);
};

var loadHistory = function(floorNumber, minute) {
    floor.draw();
    peopleInFloor = [];
    loadFlorItems(floorNumber);
    
    var currentTime = new Date();
    // Show history
    var events = getPeopleLocationHistoryOnMinute(floorNumber, currentTime.getFullYear(), currentTime.getMonth() + 1, currentTime.getDate(), currentTime.getHours(), minute);
    var itemFrequency = [];
    var data = [];
    var popularItem = '';
    var maxFreq = 0;
    var noOfStaffs = 0;
    var noOfCustomers = 0;

    for (i = 0; i < events.length; i++) {
        var event = events[i];
        var id = event.ID;
        var shelfNumber = event.SHELFNUMBER;
        var x = shelfNumber % 15;
        var y = (shelfNumber - x) / 15;

        var itemName;
        var isCustomer = !id.toLowerCase().startsWith("s");
        if (currentFloorItems[floorNumber][shelfNumber]) {
            itemName = currentFloorItems[floorNumber][shelfNumber];
        }
        if (isCustomer) {
            noOfCustomers++;
        } else {
            noOfStaffs++;
        }

        if (itemName && isCustomer) {
            if (itemFrequency[itemName]) {
                itemFrequency[itemName]++;
            } else {
                itemFrequency[itemName] = 1;
            }
            if (maxFreq < itemFrequency[itemName]) {
                popularItem = itemName;
                maxFreq = itemFrequency[itemName]
            }
        }


        var iconIndex;
        if (isCustomer) {
            iconIndex = 0;
        } else {
            iconIndex = 1;
        }
        // floor.drawUser(new CustomerLocation(x, y, shelfNumber, id, iconIndex));
        peopleInFloor.push(new CustomerLocation(x, y, shelfNumber, id, iconIndex));
    }
    showFloorDetail(floorNumber, noOfCustomers, noOfStaffs, popularItem);
};

/**
 * The operations which must be performed during window loading are added in this method.
 * Basically it draws the floor
 */
window.onload = function() {
    setInterval(draw, 1000);

    function draw() {
        if (showCurrent) {
            floor.draw();

            // Show only the relatime status
            if (currentCustomerLocations[currentFloor]) {
                var customerIds = Object.keys(currentCustomerLocations[currentFloor]);
                var locations = []

                for (i = 0; i < customerIds.length; i++) {
                    locations.push(currentCustomerLocations[currentFloor][customerIds[i]]);
                }

                for (j = 0; j < locations.length; j++) {
                    floor.drawUser(locations[j]);
                }
            }

            var floorIds = Object.keys(currentCustomerLocations);
            for (var i = 0; i < floorIds.length; i++) {
                var floorId = floorIds[i];
                var customerIds = Object.keys(currentCustomerLocations[floorId]);
                var noOfStaffs = 0;
                var noOfCustomers = 0;
                var itemsMap = [];
                var popularItem = '';
                var maxFreq = 0;

                for (var j = 0; j < customerIds.length; j++) {
                    var id = customerIds[j];
                    var shelfNumber = currentCustomerLocations[floorId][id].shelfNumber;
                    var itemName;
                    var isCustomer = !id.toLowerCase().startsWith("s");
                    if (currentFloorItems[floorId][shelfNumber]) {
                        itemName = currentFloorItems[floorId][shelfNumber];
                    }
                    if (isCustomer) {
                        noOfCustomers++;
                    } else {
                        noOfStaffs++;
                    }
                    if (itemName && isCustomer) {
                        if (itemsMap[itemName]) {
                            itemsMap[itemName]++;
                        } else {
                            itemsMap[itemName] = 1;
                        }

                        if (maxFreq < itemsMap[itemName]) {
                            popularItem = itemName;
                            maxFreq = itemsMap[itemName]
                        }
                    }
                }

                showFloorDetail(floorId, noOfCustomers, noOfStaffs, popularItem);

            }
        } else if(showHistory && peopleInFloor.length > 0) {
            floor.draw();
            for(var i = 0; i < peopleInFloor.length; i++) {
                floor.drawUser(peopleInFloor[i]);
            }
            peopleInFloor = [];
        }
    }
};

/**
 * When user selects the view perspective in the drop down, set the selected value to the dropdown
 * and set the flag showHeatMap based on the selection. Later this showHeatMap bariable is used
 * to decide whether to call drawCustomerHeatMap or drawUser.
 */
$(".dropdown-menu li a").click(function() {
    $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
    $(this).parents(".dropdown").find('.btn').val($(this).data('value'));

    showCurrent = "Customer movements" === $(this).text();
    showHeatMap = "Heatmap of customers" === $(this).text();
    showHistory = "History of movements" === $(this).text();

    if (showHeatMap) {
        loadHeatMap(currentFloor);
    }
    if (showHistory) {
        $('#slider').show();
        loadHistory(currentFloor, currentMinute);
    } else {
        $('#slider').hide();
    }
});

/**
 * The bootstrap alert does not use the default close behaviour because it will remove the alert from
 * the DOM. In such case the alert cannot be reused later. The following snippet just hides the alert
 * when the user clicks on the close button of the alert.
 */
$('.alert .close').on('click', function(e) {
    $(this).parent().hide();
});

/**
 * Read data/floor.json and create the list of Floors in the right panel.
 */
$.getJSON("/portal/store/carbon.super/fs/gadget/proximity-marketing/data/floors.json", function(data) {
    for (i = 0; i < data.floors.length; i++) {
        var id = data.floors[i].id;
        var name = data.floors[i].name;
        var isFirst = i == 0;

        // Load the first floor by default
        if (isFirst) {
            $('#accordion').append('<div class="panel panel-default"> <div class="panel-heading"> <h4 class="panel-title"> <a data-toggle="collapse" data-parent="#accordion" href="#floor' + id + '" onclick="loadFloor(' + id + ')">' + name + '</a> </h4> </div> <div id="floor' + id + '" class="panel-collapse collapse in" aria-expanded="' + isFirst + '"> <div class="panel-body"> Please wait until details of this floor are available </div> </div> </div>');
            floor.load(id);
        } else {
            $('#accordion').append('<div class="panel panel-default"> <div class="panel-heading"> <h4 class="panel-title"> <a data-toggle="collapse" data-parent="#accordion" href="#floor' + id + '" onclick="loadFloor(' + id + ')">' + name + '</a> </h4> </div> <div id="floor' + id + '" class="panel-collapse collapse" aria-expanded="' + isFirst + '"> <div class="panel-body"> Please wait until details of this floor are available </div> </div> </div>');
        }
    }
});

/**
 * Update the right side panel with the floor details.
 */
var showFloorDetail = function(floorId, noOfCustomers, noOfStaffs, popularItem) {
    $('#floor' + floorId).find('.panel-body').html('<b>No of customers: </b>' + noOfCustomers + '<br> <br> <b>No of staffs: </b>' + noOfStaffs + '<br> <br> <b>Most attractive product: </b>' + popularItem + ' <br>');
}

/**
 * Show alert on top of floor view.
 */
var showAlert = function(type, title, message) {
    $('#alert-success').hide();
    $('#alert-info').hide();
    $('#alert-warning').hide();
    $('#alert-danger').hide();

    var alertId;
    if (type === "success") {
        alertId = "#alert-success";
    } else if (type === "warning") {
        alertId = "#alert-warning";
    } else if (type === "danger") {
        alertId = "#alert-danger";
    } else {
        // Info is the default alert type
        alertId = "#alert-info";
    }
    $(alertId).find(".message").html("<strong>" + title + "!</strong> " + message);
    $(alertId).show();
}

var setCurrentCustomerLocations = function(customers) {
    for (i = 0; i < customers.length; i++) {
        var customer = customers[i];
        var customerId = customer[2];
        var floorNumber = customer[3];
        var cellNumber = customer[4];
        var x = cellNumber % 15;
        var y = (cellNumber - x) / 15;

        loadFlorItems(floorNumber);

        if (!currentCustomerLocations[floorNumber]) {
            // This floor is not added already
            currentCustomerLocations[floorNumber] = {};
        }

        if (cellNumber < 0 && currentCustomerLocations[floorNumber][customerId]) {
            // If the cell number id negative, user left the shop
            delete currentCustomerLocations[floorNumber][customerId];
        } else {
            if (currentCustomerLocations[floorNumber][customerId]) {
                currentCustomerLocations[floorNumber][customerId].x = x;
                currentCustomerLocations[floorNumber][customerId].y = y;
            } else {
                var iconIndex;
                if (customerId.toLowerCase().startsWith("s")) {
                    iconIndex = 1; // Last icon is for staff
                } else {
                    iconIndex = 0;
                }
                currentCustomerLocations[floorNumber][customerId] = new CustomerLocation(x, y, cellNumber, customerId, iconIndex);
            }
        }
    }
}

/**
 * On minute slider value changed.
 */

 var timeSlider = $("#time-slider").bootstrapSlider();

$('#time-slider').slider({
    formatter: function(value) {
        // if (showHistory) {
        //     loadHistory(currentFloor, value);
        // }
        currentMinute = value;
        return value;
    }
});

var loadFlorItems = function(floorNumber) {
    if (!currentFloorItems[floorNumber]) {
        currentFloorItems[floorNumber] = {};
        var itemData = getItemDetails(floorNumber);

        for (i = 0; i < itemData.length; i++) {
            var item = itemData[i];
            currentFloorItems[floorNumber][item.shelfNumber] = item.name;
        }
    }
}
