var MAX_CUSTOMER_ICONS = 5;

function FloorMap(canvas, cfg) {

    // Properties
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.matrix = undefined;
    this.round = 0;
    this.icons = []
    this.customerIcons = []
    this.drawnCustomers = []
    this.max = 1;

    // Merge of the default and delivered config.
    var defaults = {
        cellsX: 25,
        cellsY: 25,
        cellSize: 50,
        rules: "23/3",
        gridColor: "#F8F8F8",
        cellColor: "#ccc"
    };
    this.cfg = $.extend({}, defaults, cfg);

    // Initialize the canvas and matrix.
    this.init();
}

function Cell(x, y, itemName, customerName) {
    this.x = x;
    this.y = y;
    this.itemName = itemName;
    this.customers = [customerName];
}

function CustomerLocation(x, y, itemName, customerName) {
    this.x = x;
    this.y = y;
    this.itemName = itemName;
    this.customerName = customerName;
}

FloorMap.prototype = {
    init: function() {
        for (i = 1; i <= MAX_CUSTOMER_ICONS; i++) {
            var customerIcon = new Image();
            customerIcon.src = "/portal/store/carbon.super/fs/gadget/proximity-marketing/img/customer_" + i + ".png";
            this.customerIcons.push(customerIcon);
        }
    },

    load: function(jsonPath) {
        this.icons = []
        this.drawnCustomers = []
        var $this = this;
        $.getJSON(jsonPath, function(json) {
            $this.cfg.cellsX = json.width;
            $this.cfg.cellsY = json.height;
            $this.canvas.width = $this.cfg.cellsX * $this.cfg.cellSize;
            $this.canvas.height = $this.cfg.cellsY * $this.cfg.cellSize;

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
                    this.ctx.fillRect(x * this.cfg.cellSize + 1,
                        y * this.cfg.cellSize + 1,
                        this.cfg.cellSize,
                        this.cfg.cellSize);
                } else {
                    this.ctx.fillStyle = this.cfg.cellColor;
                    this.ctx.fillRect(x * this.cfg.cellSize + 1, y * this.cfg.cellSize + 1, this.cfg.cellSize, this.cfg.cellSize);

                    var cx = x * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 16;
                    var cy = y * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 16;

                    if (this.matrix[x][y] > 1) {
                        this.ctx.drawImage(this.icons[this.matrix[x][y] - 2], cx, cy);
                    }
                }
            }
        }
    },

    drawCustomerHeatMap: function(location) {
        var next_customer = false;
        var heat = simpleheat(this.canvas);

        var data = [];


        var x = location.x;
        var y = location.y;
        var iconIndex = 0;

        var customerLocation;
        for (i = 0; i < this.drawnCustomers.length; i++) {
            customerLocation = this.drawnCustomers[i];
            if (customerLocation.x == x && customerLocation.y == y) {
                next_customer = true;
                iconIndex = customerLocation.customers.length % MAX_CUSTOMER_ICONS;
                break;
            }
        }

        if (!next_customer) {
            var cx = x * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 70;
            var cy = y * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 70;
            data.push([cx, cy, 1]);
            this.drawnCustomers.push(new Cell(x, y, location.itemName, location.customerName));
        } else {
            var cx = x * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 70;
            var cy = y * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 70;
            customerLocation.customers.push(location.customerName);
            if (this.max < customerLocation.customers.length) {
                this.max = customerLocation.customers.length;
            }
            data.push([cx, cy, customerLocation.customers.length]);
        }

        heat.radius(25, 45);
        heat.data(data);
        heat.max(this.max);
        heat.draw(0.5);
    },

    drawCustomerMovement: function(location) {
        var next_customer = false;

        var x = location.x;
        var y = location.y;
        var iconIndex = 0;

        var customerLocation;
        for (i = 0; i < this.drawnCustomers.length; i++) {
            customerLocation = this.drawnCustomers[i];
            if (customerLocation.x == x && customerLocation.y == y) {
                next_customer = true;
                iconIndex = customerLocation.customers.length % MAX_CUSTOMER_ICONS;
                break;
            }
        }

        if (!next_customer) {
            var cx = x * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 5;
            var cy = y * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 20;
            this.ctx.drawImage(this.customerIcons[iconIndex], cx, cy);
            this.drawnCustomers.push(new Cell(x, y, location.itemName, location.customerName));
        } else {
            var cx = x * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 5 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            var cy = y * this.cfg.cellSize + Math.round(this.cfg.cellSize / 2) - 20 + this.randomDeviate() * Math.pow(-1, this.randomDeviate());
            this.ctx.drawImage(this.customerIcons[iconIndex], cx, cy);
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
     * Clears the entire matrix, by setting all cells to -1.
     */
    clear: function() {
        for (var x = 0; x < this.matrix.length; x++) {
            for (var y = 0; y < this.matrix[x].length; y++) {
                this.matrix[x][y] = 0;
            }
        }

        this.draw();
    },

    /**
     * This method shows the information about customers available at the clicked cell.
     */
    showNotification: function(cx, cy) {
        if (cx >= 0 && cx < this.matrix.length && cy >= 0 && cy < this.matrix[0].length) {
            var title;
            var description = '';
            for (var i = 0; i < this.drawnCustomers.length; i++) {
                if (this.drawnCustomers[i].x == cx && this.drawnCustomers[i].y == cy) {
                    title = this.drawnCustomers[i].itemName;
                    for (j = 0; j < this.drawnCustomers[i].customers.length; j++) {
                        description += this.drawnCustomers[i].customers[j] + '<br>';
                    }
                    break;
                }
            }
            if (title) {
                $('#customerModal').find('#customerModalLabel').html('Customers looking at ' + title);
                $('#customerModal').find('#customerModalContent').html(description);
                $('#customerModal').modal('show');
            }
        }
    }
};

/**
 * Flag indicating whether to show the customers or heatmap.
 */
var showHeatMap = false;

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
    y -= floor.canvas.offsetTop + floor.cfg.cellSize;
    x -= rect.left;
    x = Math.floor(x / floor.cfg.cellSize);
    y = Math.floor(y / floor.cfg.cellSize);

    // Ask the floor to show notification related to this cell.
    floor.showNotification(x, y);
}, false);

/**
 * This method is called by the Floor lists displayed on the right side of the gadget.
 * The on-click binding is defined in index.html.
 */
var loadFloor = function(floorNumber) {
    floor.load(floorNumber);
}


/**
 * The operations which must be performed during window loading are added in this method.
 * Basically it draws the floor
 */
window.onload = function() {
    setInterval(draw, 1000);

    function draw() {
        floor.draw();

        customerLocations = []
        customerLocations.push(new CustomerLocation(0, 1, "Dairy", "Alice"));
        customerLocations.push(new CustomerLocation(0, 1, "Dairy", "Bob"));
        customerLocations.push(new CustomerLocation(0, 1, "Dairy", "David"));
        customerLocations.push(new CustomerLocation(0, 1, "Dairy", "Eve"));
        customerLocations.push(new CustomerLocation(0, 1, "Dairy", "Gobi"));
        customerLocations.push(new CustomerLocation(0, 2, "Hardware", "Carol"));
        customerLocations.push(new CustomerLocation(10, 4, "Furniture", "Furry"));


        for (j = 0; j < customerLocations.length; j++) {
            if (showHeatMap) {
                floor.drawCustomerHeatMap(customerLocations[j]);
            } else {
                floor.drawCustomerMovement(customerLocations[j]);
            }
        }
    }
}

/**
 * When user selects the view perspective in the drop down, set the selected value to the dropdown
 * and set the flag showHeatMap based on the selection. Later this showHeatMap bariable is used
 * to decide whether to call drawCustomerHeatMap or drawCustomerMovement.
 */
$(".dropdown-menu li a").click(function() {
    $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
    $(this).parents(".dropdown").find('.btn').val($(this).data('value'));

    showHeatMap = "Heatmap of customers" === $(this).text();
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
        var path = "/portal/store/carbon.super/fs/gadget/proximity-marketing/data/" + data.floors[i].plan;
        var isFirst = i == 0;

        // Load the first floor by default
        if (isFirst) {
            $('#accordion').append('<div class="panel panel-default"> <div class="panel-heading"> <h4 class="panel-title"> <a data-toggle="collapse" data-parent="#accordion" href="#floor' + id + '" onclick="loadFloor(\'' + path + '\')">' + name + '</a> </h4> </div> <div id="floor' + id + '" class="panel-collapse collapse in" aria-expanded="' + isFirst + '"> <div class="panel-body"> Please wait until details of this floor are available </div> </div> </div>');
            floor.load(path);
        } else {
            $('#accordion').append('<div class="panel panel-default"> <div class="panel-heading"> <h4 class="panel-title"> <a data-toggle="collapse" data-parent="#accordion" href="#floor' + id + '" onclick="loadFloor(\'' + path + '\')">' + name + '</a> </h4> </div> <div id="floor' + id + '" class="panel-collapse collapse" aria-expanded="' + isFirst + '"> <div class="panel-body"> Please wait until details of this floor are available </div> </div> </div>');
        }
    }
});

/**
 * Update the right side panel with the floor details.
 */
var showFloorDetail = function(floorId, noOfCustomers, noOfStaffs, popularItem) {
    $('#floor' + floorId).find('.panel-body').html('<b>No of customers: </b>' + noOfCustomers + '<br> <br> <b>No of staffs: </b>' + noOfStaffs + '<br> <br> <b>Most attractive product: </b>' + popularItem + ' <br>');
}

var showAlert(type, title, message) {
    $('#alert-success').hide();
    $('#alert-info').hide();
    $('#alert-warning').hide();
    $('#alert-danger').hide();

    if(type === "success") {

    } else if(type === "warning") {

    } else if(type === "danger") {

    } else {
        // Info is the default alert type
    }
    $('#alert-warning').show();
}
