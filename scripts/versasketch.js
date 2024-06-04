/*

VersaSketch

Filename: versasketch.js
Version: 1.0
Author: VersaDev Pty Ltd
Support: support@versadev.com

Purpose:

This javascript library supports VersaSketch.

Dependecies: 

jquery-3.7.1.js

*/

let VersaSketch = (function () {

    // Private global variables and functions
    let isDebug = true; // Show or hide debug window
   
    let drawingWidth = null; // Width of the drawing canvas, initialised via init() function.
    let drawingHeight = null; // Height of the drawing canvas, initialised via init() function.
    let emptyDrawingArea = null; // Defines the data for an empty drawing area. Used later for validation.
    let drawAreaNum = 0;            
    let drawBackground = null;   
    let drawArea1 = null;   
    let highlightArea = null;      
    let ctx = [];
    let target = null;

    let isDrawing = [];
    let isDrawStart = [];

    let pointerXYData = []; // An array to track the position of the pointer whilst drawing
    let pointerXYLast = {}; // An object to track the last position of the pointer whilst drawing

    let scale = 1.0; // Default display scale
    let activeTool = 1; // Default to pen tool
    let showGrid = true; // Sets the default state of the grid
    let gridColour = "#aaaaaa"; // Default grid colour
    let gridSize = 20; // Default grid size
    let gridBackgroundColour = "#ffffff"; // Default grid background colour

    let defaultBackgroundImageSrc = "media/ruled.jpg"; // A default background image src. If defined, the grid will not be displayed. Show and hide grid will toggle background image display.
    let defaultSketchFilename = 'sketch1.vsk'; // The default filename for a sketch.

    let penColour = null; // Pen colour
    let penSize = null; // Pen size   
    let highlighterColour = null; // Highlighter colour
    let highlighterSize = null; // Highlighter size
    let eraserSize = null; // Eraser size
    let eraserShape = null; // Eraser shape (null - not set | 0 - circle | 1 - square)        
    
    let sketch = null; // Object to hold sketch data

    let colourPalette = [{name: "Black", value: "#000000"},
    {name: "Light Grey", value: "#888888"},
    {name: "White", value: "#ffffff"},
    {name: "Red", value: "#ff0000"},
    {name: "Orange", value: "#d88211"},
    {name: "Yellow", value: "#dfd113"},
    {name: "Green", value: "#13be1c"},
    {name: "Blue", value: "#138ebe"},
    {name: "Purple", value: "#7113be"}];

    let colourPaletteHighlighter = [{name: "Highlighter Eraser", value: "transparent"},
    {name: "Radical Red", value: "#ff355e"},
    {name: "Wild Watermelon", value: "#fd5b78"},
    {name: "Outrageous Orange", value: "#ff6037"},
    {name: "Laser Lemon", value: "#ffff66"},
    {name: "Electric Lime", value: "#ccff00"},
    {name: "Screamin' Green", value: "#66ff66"},
    {name: "Blizzard Blue", value: "#50bfe6"},
    {name: "Shocking Pink", value: "#ff6eff"},
    {name: "Hot Magenta", value: "#ff00cc"}];
    
    class Sketch {

            constructor() {
                this._filename = ''; // Sketch filename
                this._width = 0; // Sketch width (pixels)
                this._height = 0; // Sketch height (pixels)
                this._layerCount = 3; // Default to 3 layers
                this._layers = []; // An array to hold a collection of sketch layers
            }

            get filename() { return this._filename; }
            set filename(value) { this._filename = value; }

            get width() { return this._width; }
            set width(value) { this._width = value; }

            get height() { return this._height; }
            set height(value) { this._height = value; }

            get layerCount() { return this._layerCount; }
            set layerCount(value) { this._layerCount = value; }

            get layers() { return this._layers; }
            set layers(value) { this._layers = value; }

            // Specifically control how the JSON for this object is returned.
            // By adding a toJSON method to your class, JSON.stringify will know how to print your class instance.
            // Without this, properties of the JSON are returned as private variable names (i.e the properties prefixed with _)
            toJSON() {
                return {
                    filename: this.filename,
                    width: this.width,
                    height: this.height, 
                    layerCount: this.layerCount,
                    layers: this.layers
                }
            }

    };

    class SketchLayer {

        constructor() {
            this._name = ''; // Layer name
            this._description = ''; // Layer description
            this._visible = true; // Layer visibility
            this._data = ''; // Layer image data
        }

        get name() { return this._name; }
        set name(value) { this._name = value; }

        get description() { return this._description; }
        set description(value) { this._description = value; }

        get visible() { return this._visible; }
        set visible(value) { this._visible = value; }
        
        get data() { return this._data; }
        set data(value) { this._data = value; }

        // Specifically control how the JSON for this object is returned.
        // By adding a toJSON method to your class, JSON.stringify will know how to print your class instance.
        // Without this, properties of the JSON are returned as private variable names (i.e the properties prefixed with _)
        toJSON() {
            return {
                name: this.name,
                description: this.description,
                visible: this.visible, 
                data: this.data,                        
            }
        }

    };

    let translatePos = {
            x: 0,
            y: 0
    };

    let drawCircle = function (canvasContext, x1, y1, radius, color, fill) {
        // Function - Draw a circle
        canvasContext.lineWidth = 4;
        canvasContext.strokeStyle = color;
        canvasContext.beginPath();
        canvasContext.arc(x1, y1, radius, (Math.PI/180)*0, (Math.PI/180)*360, false);
        canvasContext.fillStyle = color;
        if (fill == true) {
            canvasContext.fill();
        }
        canvasContext.stroke();
        canvasContext.closePath();
    };

    let drawLine = function (canvasContext, x1, y1, x2, y2, colour, lineWidth) {
        // Function - Draw a line
        // Boundary mismatch issue when drawing lines - Npx width lines are actually greater than Npx
        // Fix line widths - Ref: https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines
        y1 = y1 + 0.5;
        y2 = y2 + 0.5;

        canvasContext.strokeStyle = colour;
        canvasContext.lineWidth = lineWidth;
        canvasContext.lineJoin = 'bevel';
        canvasContext.lineCap = 'round';                
        canvasContext.beginPath();
        canvasContext.moveTo(x1, y1);
        canvasContext.lineTo(x2, y2);
        canvasContext.stroke();
        canvasContext.closePath();            
    };

    let drawBox = function (canvasContext, x1, y1, width, height, colour, lineWidth, fill) {
        // Function - Draw a box

        if (fill == false) {
            canvasContext.strokeStyle = colour;
            canvasContext.lineWidth = lineWidth;
            canvasContext.strokeRect(x1, y1, width, height);
           
        }  else {
            canvasContext.strokeStyle = colour;
            canvasContext.lineWidth = lineWidth;
            canvasContext.fillStyle = colour;
            canvasContext.fillRect(x1, y1, width, height);                                      
        }
                 
    };

    let hexToRGB = function (hex) {
        // Return hex colour as RGB
        // Ref: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

        // Define object to return rgb values
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;

    };

    let captureEvents = function () {

        // Setup        
        isDrawStart[2] = false;
        isDrawing[2] = false;

        // Setup capture events
        drawArea1.addEventListener("mousedown", function () {            
            isDrawing[2] = true;
            on_mousedown(event, 2);
        }, false);

        drawArea1.addEventListener("touchstart", function () {                
            isDrawing[2] = true;
            on_mousedown(event, 2);
        }, false);

    };

    let remove_event_listeners = function () {

        drawArea1.removeEventListener('mousemove', startDraw, false);
        drawArea1.removeEventListener('mouseup', stopDraw, false);
        drawArea1.removeEventListener('touchmove', startDraw, false);
        drawArea1.removeEventListener('touchend', stopDraw, false);

        document.body.removeEventListener('mouseup', stopDraw, false);
        document.body.removeEventListener('touchend', stopDraw, false);

    };

    let get_coords = function (e) {

        // Return the x and y position and mode of the pointer within the element
        let x, y, mode;

        offset = $(e.target).offset();

        if (typeof e.targetTouches !== 'undefined') {
            mode = 1
            x = Math.floor(e.targetTouches[0].pageX - offset.left);
            y = Math.floor(e.targetTouches[0].pageY - offset.top);
        } else {
            mode = 2;
            x = Math.floor(e.pageX - offset.left);
            y = Math.floor(e.pageY - offset.top);
        }

        return {
            x: x,
            y: y,
            mode: mode
        };

    };

    let on_mousedown = function (e, drawingAreaSelected) {

        // Mouse or Pen down
        e.preventDefault();
        e.stopPropagation();

        // Track active drawing area control.
        // The drawing area control will always be the main canvas.
        // However, we may output to a different canvas depending on the tool selected.
        // For example, the drawing events for the highlighter are based on the mouse / touch events
        // on the main canvas but the output of the tool is sent to the highlighter canvas.
        // Consequently, drawAreaNum will always be set to 2.
        drawAreaNum = drawingAreaSelected;
        //console.log(drawAreaNum);

        // Attach events to support drawing with the mouse or pen on the canvas
        drawArea1.addEventListener('mouseup', stopDraw, false);
        drawArea1.addEventListener('mousemove', startDraw, false);
        drawArea1.addEventListener('touchend', stopDraw, false);
        drawArea1.addEventListener('touchmove', startDraw, false);

        document.body.addEventListener('mouseup', stopDraw, false);
        document.body.addEventListener('touchend', stopDraw, false);

        // Determine x and y position of the pointer within the element
        let x = 0;
        let y = 0;
        let mode = 0;
        let xy = 0;
        xy = get_coords(e);
        x = xy.x;
        y = xy.y;
        mode = xy.mode;

        // Adjust for scale
        x = x / scale;
        y = y / scale;
        xy.x = x; // Update any changes due to scale
        xy.y = y; // Update any changes due to scale

        // Display x and y position of the pointer within the element
        target.x.innerHTML = x.toString();
        target.y.innerHTML = y.toString();
        target.mode.innerHTML = mode.toString();
        target.drawAreaNum.innerHTML = drawAreaNum.toString();
        target.toolNum.innerHTML = activeTool.toString();

        if (activeTool == 1) {

            // Pen tool
            document.getElementById("drawArea1").style.cursor = "default"; // show default cursor
            ctx[drawAreaNum].globalCompositeOperation = 'source-over'; // Important - Default - draw on canvas 
            
            // Create shadow colour based on pen colour
            //ctx[drawAreaNum].shadowColor = "rgba(0,0,0,.5)";
            let rgb = null;
            let penShadowColour = null;
            rgb = hexToRGB(penColour);
            penShadowColour = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + '0.1' + ')';
            ctx[drawAreaNum].shadowColor = penShadowColour;

            ctx[drawAreaNum].shadowBlur = penSize * 2;
            ctx[drawAreaNum].lineCap = 'round';
            ctx[drawAreaNum].lineJoin = 'round';
            ctx[drawAreaNum].lineWidth = penSize;
            ctx[drawAreaNum].strokeStyle = penColour;

            // Begin drawing
            isDrawStart[drawAreaNum] = true;

            //x = x + (translatePos.x);
            //y = y + (translatePos.y);

            ctx[drawAreaNum].beginPath();
            // Clear pointer data
            pointerXYData.length = 0;
            pointerXYData.push('drawStart');
            ctx[drawAreaNum].moveTo(x, y);
            //ctx[drawAreaNum].stroke();
            pointerXYData.push(x, y);
            pointerXYLast = xy;

        }

        if (activeTool == 2) {

            // Highlight tool
            document.getElementById("drawArea1").style.cursor = "default"; // show default cursor

            let highlighterEraser = false;

            if (highlighterColour == 'transparent') {
                highlighterEraser = true;
            }

            // Output to the highlighter canvas
            if (highlighterEraser == true) {
                ctx[1].globalCompositeOperation = 'destination-out' // Important - Preserve the underlying grid. The source is painted transparent allowing the grid to show through.
            } else {
                ctx[1].globalCompositeOperation = 'source-over'; // Important - Default - draw on canvas 
            }
            
            let highlighterShadowColour = null;
            if (highlighterEraser == false) {
                // Create shadow colour based on highlighter colour
                //ctx[1].shadowColor = "rgba(0,0,0,.5)";
                let rgb = null;                        
                rgb = hexToRGB(highlighterColour);
                highlighterShadowColour = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + '0.1' + ')';                         
            } else {
                highlighterShadowColour = '#ff0000'; // The colour (but NOT transparent) does not actually matter when globalCompositeOperation = 'destination-out'
            }

            ctx[1].shadowColor = highlighterShadowColour;
            ctx[1].shadowBlur = 0; //highlighterSize * 2;
            ctx[1].lineCap = 'round';
            ctx[1].lineJoin = 'round';
            ctx[1].lineWidth = highlighterSize;
            ctx[1].strokeStyle = highlighterShadowColour; // Use shadow colour for highlighter (creates a water colour, thick marker effect)

            // Begin drawing
            isDrawStart[drawAreaNum] = true;

            ctx[1].beginPath();

            // Clear pointer data
            pointerXYData.length = 0;
            pointerXYData.push('drawStart');
            ctx[1].moveTo(x, y);
            pointerXYData.push(x, y);
            pointerXYLast = xy;

        }

        if (activeTool == 3) {

            // Eraser tool
            ctx[drawAreaNum].globalCompositeOperation = 'destination-out' // Important - Preserve the underlying grid. The source is painted transparent allowing the grid to show through.

            isDrawStart[drawAreaNum] = true;                    

        }

    };

    let startDraw = function (e) {

        // Mouse or Pen Moving - Draw on the canvas

        // Important, prevent and stop default events. Without this touch lags.
        e.preventDefault();
        e.stopPropagation();

        // Determine x and y position of the pointer within the element
        let x = 0;
        let y = 0;
        let mode = 0;
        let xy = 0;
        xy = get_coords(e);
        x = xy.x;
        y = xy.y;
        mode = xy.mode;

        // Adjust for scale
        x = x / scale;
        y = y / scale;
        xy.x = x; // Update any changes due to scale
        xy.y = y; // Update any changes due to scale

        // Display x and y position of the pointer within the element
        target.x.innerHTML = x.toString();
        target.y.innerHTML = y.toString();
        target.mode.innerHTML = mode.toString();
        target.drawAreaNum.innerHTML = drawAreaNum.toString();
        target.toolNum.innerHTML = activeTool.toString();

        if (activeTool == 1) {

            // Pen tool

            // Create shadow colour based on pen colour
            //ctx[drawAreaNum].shadowColor = "rgba(0,0,0,.5)";
            let rgb = null;
            let penShadowColour = null;
            rgb = hexToRGB(penColour);
            penShadowColour = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + '0.1' + ')';
            ctx[drawAreaNum].shadowColor = penShadowColour;

            ctx[drawAreaNum].shadowBlur = penSize * 2;
            ctx[drawAreaNum].lineCap = 'round';
            ctx[drawAreaNum].lineJoin = 'round';
            ctx[drawAreaNum].lineWidth = penSize;
            ctx[drawAreaNum].strokeStyle = penColour;

            if (isDrawing[drawAreaNum] == true) {

                // Continue drawing
                //x = x + (translatePos.x);
                //y = y + (translatePos.y);
                //console.log(x);

                ctx[drawAreaNum].quadraticCurveTo(pointerXYLast.x, pointerXYLast.y, x, y);

                pointerXYData.push(x, y);
                ctx[drawAreaNum].stroke();
                ctx[drawAreaNum].beginPath();
                ctx[drawAreaNum].moveTo(x, y);
                pointerXYLast = xy;
                
            }

        }

        if (activeTool == 2) {

            // Highlight tool

            let highlighterEraser = false;

            if (highlighterColour == 'transparent') {
                highlighterEraser = true;
            }

            let highlighterShadowColour = null;
            if (highlighterEraser == false) {
                // Create shadow colour based on highlighter colour
                //ctx[1].shadowColor = "rgba(0,0,0,.5)";
                let rgb = null;                        
                rgb = hexToRGB(highlighterColour);
                highlighterShadowColour = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + '0.1' + ')';                         
            } else {
                highlighterShadowColour = '#ff0000'; // The colour (but NOT transparent) does not actually matter when globalCompositeOperation = 'destination-out'
            }

            ctx[1].shadowColor = highlighterShadowColour;                    
            ctx[1].shadowBlur = 0; //highlighterSize * 2;
            ctx[1].lineCap = 'round';
            ctx[1].lineJoin = 'round';
            ctx[1].lineWidth = highlighterSize;
            ctx[1].strokeStyle = highlighterShadowColour; // Use shadow colour for highlighter (creates a water colour, thick marker effect)

            if (isDrawing[drawAreaNum] == true) {

                // Continue drawing
                ctx[1].quadraticCurveTo(pointerXYLast.x, pointerXYLast.y, x, y);

                pointerXYData.push(x, y);
                ctx[1].stroke();
                ctx[1].beginPath();
                ctx[1].moveTo(x, y);
                pointerXYLast = xy;
                
            }

        }

        if (activeTool == 3) {

            // Eraser tool                    
            let el = null;                    
            el = document.getElementById('toolEraser');                    
            
            // Update the size of the tool to reflect the eraser settings
            // Important: eraserSize must be half the size of the DIV that defines the eraser tool
            // Important: scale the size of the eraser DIV to the current scale

            el.style.width = (eraserSize * 2 * scale) + 'px';
            el.style.height = (eraserSize * 2 * scale) + 'px';
            if (eraserShape == 0) {
                // Circle
                el.style.borderRadius = (eraserSize * scale) + 'px';
            } else {
                // Square
                el.style.borderRadius = '0px';
            }
            
            // Correct eraser behaviour for the scale and viewport setting
            // The eraser size has been adjusted above to handle scale change.
            // Now need to consider the viewport.
            // This is very different to canvas drawing as the DIV eraser will only ever be positioned
            // within the viewport but the canvas can scroll.
            // Will need to adjust display of the eraser DIV based on viewport.

            let eraserDivX = null; // x position of eraser div
            let eraserDivY = null; // y position of eraser div

            // Determine viewport scroll positions
            // This will be used to adjust the eraser DIV
            let viewPort = {
                xScroll: 0, // Horizontal scroll position
                yScroll: 0, // Vertical scroll position
                xMin: 0, // Minimum x position of cursor on the canvas - top left = 0,0 (scale and sroll will apply)
                yMin: 0, // Minimum y position of cursor on the canvas - top left = 0,0 (scale and sroll will apply)
                xMax: 0, // Maximum x position of cursor on the canvas - bottom right = canvas width, canvas height (scale and sroll will apply)
                yMax: 0, // Maximum y position of cursor on the canvas - bottom right = canvas width, canvas height (scale and sroll will apply)
            };

            let xScroll = 0;
            let yScroll = 0;
            let vp = document.getElementById('canvasContainer'); // A container for canvas elements. This can scroll if the canvas is bigger than the container.
            viewPort.xScroll = vp.scrollLeft; // Determine horizontal scroll position
            viewPort.yScroll = vp.scrollTop;  // Determine vertical scroll position                  
            viewPort.xMin = vp.scrollLeft; // Determine the minimum x position for the viewport
            viewPort.yMin = vp.scrollTop; // Determine the minimum y position for the viewport
            viewPort.xMax = vp.clientWidth + vp.scrollLeft; // Determine the maximum x position for the viewport (clientWidth adjusts if the scrollbar is displayed)
            viewPort.yMax = vp.clientHeight + vp.scrollTop; // Determine the maximum y position for the viewport (clientWidth adjusts if the scrollbar is displayed)
            //console.log(viewPort);
            
            // Adjust eraser div position for scale and viewport
            // Effectively, we do not apply the scale to the eraser DIV position as we would a canvas drawing tool (pen, highlighter etc).
            eraserDivX = (x * scale) - viewPort.xScroll;
            eraserDivY = (y * scale) - viewPort.yScroll;

            // Hide the eraser tool if the cursor goes outside the drawing area.
            // This is more complicated because the drawing area (canvas) can be bigger that the viewport.
            // Furthermore, even if the entire canvas is within the viewport, the zoom level can cause the canvas to go beyond the viewport.

            //console.log(x + (2 * eraserSize) + ' : ' + (viewPort.xMax / scale));

            if (x <= viewPort.xMin / scale || x + (2 * eraserSize) >= viewPort.xMax / scale || y <= viewPort.yMin / scale || y + (2 * eraserSize) >= viewPort.yMax / scale) {

                // Hide the tool
                document.getElementById("drawArea1").style.cursor = "default"; // show default cursor
                el.style.visibility = 'hidden';
                el.style.display = 'none';

            } else {

                // Show the eraser tool
                document.getElementById("drawArea1").style.cursor = "none"; // Remove cursor for drawing area
                el.style.visibility = 'visible';
                el.style.display = '';

                // Position the eraser div
                el.style.left = eraserDivX.toString() + 'px';
                el.style.top = eraserDivY.toString() + 'px';

                // Apply the eraser                        
                let eraserColour = '#ff0000'; // This colour is irrelevant as the source is painted transparent (globalCompositeOperation = 'destination-out')
                ctx[2].shadowColor = eraserColour;
                ctx[2].shadowBlur = 0;    

                if (eraserShape == 0) {
                    // Circle
                    drawCircle(ctx[2], x + eraserSize, y + eraserSize, eraserSize, eraserColour, true);
                } else {
                    // Square
                    drawBox(ctx[2], x, y, eraserSize * 2, eraserSize * 2, eraserColour, 1, true);
                }                
                
            }

        }


    };

    let stopDraw = function (e) {

        if (activeTool == 1) {
            // Pen tool

            // Mouse or Pen up
            remove_event_listeners();

            // Finalise drawing following mouse up or touch end
            isDrawing[drawAreaNum] = false;
            isDrawStart[drawAreaNum] = false;
            pointerXYData.push('drawEnd');
            ctx[drawAreaNum].stroke();

            // Display pointer data
            let pointerText = '';
            for (let i = 0; i <= pointerXYData.length - 1; i++) {
                pointerText = pointerText + pointerXYData[i] + ', ';
            }
            document.getElementById('pointerData').innerHTML = pointerText;

            // Reset - no drawing area active
            drawAreaNum = 0;

        }

        if (activeTool == 2) {

            // Highlight tool

            // Mouse or Pen up
            remove_event_listeners();

            // Finalise drawing following mouse up or touch end
            isDrawing[drawAreaNum] = false;
            isDrawStart[drawAreaNum] = false;
            pointerXYData.push('drawEnd');
            ctx[1].stroke();

            // Display pointer data
            let pointerText = '';
            for (let i = 0; i <= pointerXYData.length - 1; i++) {
                pointerText = pointerText + pointerXYData[i] + ', ';
            }
            document.getElementById('pointerData').innerHTML = pointerText;

            // Reset - no drawing area active
            drawAreaNum = 0;

        }

        if (activeTool == 3) {
            // Eraser tool
            let el = null;
            el = document.getElementById('toolEraser');                    

            // Mouse or Pen up
            remove_event_listeners();

            // Restore cursor
            document.getElementById("drawArea1").style.cursor = "default"; // show default cursor

            // Remove eraser
            el.style.visibility = 'hidden';
            el.style.display = 'none';

            // Reset - no drawing area active
            drawAreaNum = 0;

        }

    };

    let setZoom = function (zoomLevel) {

        //console.log(zoomLevel);
        scale = zoomLevel / 100;
        
        let mainCanvas = null;
        mainCanvas = document.getElementById('drawArea1');

        translatePos.x = mainCanvas.width * scale;
        translatePos.y = mainCanvas.height * scale;

        //console.log(translatePos);

        //ctx[2].save();
        //ctx[2].translate(translatePos.x, translatePos.y);
        //ctx[2].scale(scale, scale);
        //ctx[2].restore();       

        let canvasLayers = [{name: "Background", id: "drawBackground"},
        {name: "Highlighter", id: "highlightArea"},
        {name: "Default", id: "drawArea1"}];

        let i = 0;
        let el = null;

        for (i=0; i <= canvasLayers.length - 1; i++) {
            el = document.getElementById(canvasLayers[i].id);
            el.style.transform = 'scale(' + scale.toString() + ')';
            el.style.transformOrigin = '0 0';
        }
                        
    };

    let clearDrawingArea = function (drawAreaNum) {

        // Clear the appropriate canvas
        switch (drawAreaNum) {
            case 2:
                reset();
                break;
        }

    };

    let reset = function () {

        // Clear the highlighter area
        ctx[1].fillRect(0, 0, drawingWidth, drawingHeight);
        ctx[1].clearRect(0, 0, drawingWidth, drawingHeight);

        // Clear the drawing area    
        //ctx[2].fillStyle = "#000000";             
        ctx[2].fillRect(0, 0, drawingWidth, drawingHeight);
        ctx[2].clearRect(0, 0, drawingWidth, drawingHeight);

        // Reset tools to their initial settings
        initialiseTools();

        // The next lines are important.
        // If a user has been working on an image and the last thing they did was either use the eraser
        // or the highlight eraser, each layer will load but will not be displayed. You can simulate this by
        // following loading, selecting a pen tool and draw and then select load again to correctly display the image.
        // Setting the globalCompositeOperation = 'source-over' on the highlight and drawing layer ensures the image
        // loads correctly.
        ctx[1].globalCompositeOperation = 'source-over'; // Important - Default - draw (highlight) on canvas 
        ctx[2].globalCompositeOperation = 'source-over'; // Important - Default - draw on canvas 

        // Clear pointer data
        pointerXYData = [];
        pointerXYLast = {};

        // Clear the debug output
        target.x.innerHTML = '';
        target.y.innerHTML = '';
        target.mode.innerHTML = '';
        target.drawAreaNum.innerHTML = '';
        target.pointerData.innerHTML = '';

    };

    let initialiseTools = function () {

        // Initialise the tools to their default settings
        VersaSketch.changeTool(null, 1);
        VersaSketch.changePenColour(0);
        VersaSketch.changePenSize(null, 2);
        VersaSketch.changeHighlighterColour(4);
        VersaSketch.changeHighlighterSize(null, 5);                    
        VersaSketch.changeEraserSize(null, 3);
        VersaSketch.changeEraserShape(null, 0);
    };

    let setTool = function (tooltype) {

        let el = null;

        document.getElementById("drawArea1").style.cursor = "default"; // Enable default cursor for drawing area
        el = document.getElementById('toolEraser');
        el.style.visibility = 'hidden';
        el.style.display = 'none';

        switch(tooltype) {
            case 1:
                // Pen
                activeTool = 1;
                break;
            case 2:
                // Highlighter
                activeTool = 2;
                break;
            case 3:
                // Eraser                                          
                activeTool = 3;
                break;
            default:
                // Pen
                activeTool = 1;
        }

    };

    let toggleGridDisplay = function () {

        let grid = null;
        grid = document.getElementById('drawBackground');

        if (showGrid == true) {
            showGrid = false;
            grid.style.visibility = 'hidden';
            grid.style.display = 'none';
        } else {
            showGrid = true;
            grid.style.visibility = 'visible';
            grid.style.display = '';                    
        }
        
    };

    let hideToolSettings = function () {

        // Hide all tool settings
        let el = null;
        el = document.getElementById('penSettings');
        el.style.visibility = 'hidden';
        el.style.display = 'none';
        el = document.getElementById('highlightSettings');
        el.style.visibility = 'hidden';
        el.style.display = 'none';
        el = document.getElementById('eraserSettings');
        el.style.visibility = 'hidden';
        el.style.display = 'none';

    };

    let showToolSettings = function(tooltype) {

        // Show specific tool settings
        let el = null;

        switch(tooltype) {
            case 1:
                // Pen
                el = document.getElementById('penSettings');
                el.style.visibility = 'visible';
                el.style.display = 'flex';
                break;
            case 2:
                // Highlighter
                el = document.getElementById('highlightSettings');
                el.style.visibility = 'visible';
                el.style.display = 'flex';
                break;
            case 3:
                // Eraser                                          
                el = document.getElementById('eraserSettings');
                el.style.visibility = 'visible';
                el.style.display = 'flex';
                break;
        }

    }

    let setColourPalette = function () {
        
        // Display the colour palette
        let i = 0;
        let swatch = null;
        for (i=0; i <= colourPalette.length - 1; i++) {
            //console.log(colourPalette[i].name);
            swatch = document.getElementById('colourSwatch' + i.toString());
            swatch.style.backgroundColor = colourPalette[i].value;
            swatch.setAttribute('title', colourPalette[i].name);
        }

    };

    let setColourPaletteHighlighter = function () {
        
        // Display the colour palette for the highlighter
        let i = 0;
        let swatch = null;
        for (i=0; i <= colourPaletteHighlighter.length - 1; i++) {
            //console.log(colourPaletteHighlighter[i].name);
            swatch = document.getElementById('highlightSwatch' + i.toString());
            swatch.style.backgroundColor = colourPaletteHighlighter[i].value;
            swatch.setAttribute('title', colourPaletteHighlighter[i].name);
        }

    };

    let setPenColour = function (swatchIndex) {

        // Change the global pen colour value
        penColour = colourPalette[swatchIndex].value;

    };

    let setPenColourAsHex = function (hexColour) {

        // Change the global pen colour value
        penColour = hexColour

    };

    let setPenSize = function (size) {

        // Change the global pen size value
        penSize = size;

    };

    let setHighlighterColour = function (swatchIndex) {

        // Change the global highlighter colour value
        highlighterColour = colourPaletteHighlighter[swatchIndex].value;

    };

    let setHighlighterSize = function (size) {

        // Change the global highlighter size value
        highlighterSize = size;

    };

    let setEraserSize = function (size) {

        // Change the global eraser size
        switch(size) {
            case 0:
                eraserSize = 20;                      
                break;
            case 1:
                eraserSize = 15;                       
                break;         
            case 2:
                eraserSize = 10;                       
                break;      
            case 3:
                eraserSize = 5;                       
                break;   
            case 4:
                eraserSize = 2;                        
                break;                                                                                                                              
            default:
                eraserSize = 20;
        }

    };

    let setEraserShape = function (shape) {

        // Change the global eraser size
        switch(shape) {
            case 0:                        
                eraserShape = 0;                        
                break;
            case 1:                        
                eraserShape = 1;                        
                break;         
            default:
                eraserShape = 0; 
        }

    };            

    // Privileged / Public Methods And Properties
    return {

        appVersion: 1.0,

        init: function (sketchWidth, sketchHeight, controlWidth, controlHeight) {

            // sketchWidth: passed as a string, sketch width in pixels
            // sketchHeight: passed as a string, sketch height in pixels
            // controlhWidth: passed as a string, control width in pixels
            // controlHeight: passed as a string, control height in pixels

            // Check for Debug mode
            if (isDebug == true) {
                $('#versaSketchDebugWindow').css('display', 'block');
                $('#versaSketchCanvasInfo').css('display', 'block');
            } else {
                $('#versaSketchDebugWindow').css('display', 'none');
                $('#versaSketchCanvasInfo').css('display', 'none');
            }

            // Set the width and the height of the sketch control
            // Default size is 602x402 as defined by the style canvasArea set on the element canvasContainer.
            if (controlWidth != null && controlHeight != null) {
                let versaSketchControl = document.getElementById('canvasContainer');
                if (controlWidth == '100%') {
                    //versaSketchControl.style.width = 'calc(100vw - 50px)';
                    versaSketchControl.style.width = $(".container").width().toString() + 'px';                    
                } else {
                    versaSketchControl.width = controlWidth;
                    versaSketchControl.style.width = controlWidth + 'px';
                }

                if (controlHeight == '100%') {
                    versaSketchControl.style.height = $(".container").height().toString() + 'px';      
                } else {
                    versaSketchControl.height = controlHeight.toString();                
                    versaSketchControl.style.height = controlHeight.toString() + 'px';            
                }
                
            }

            // Define width and height of drawing area
            // Note: adjust CSS to match
            // A4 size in pixels at 72 DPI: 595 x 842 pixels.
            drawingWidth = parseInt(sketchWidth); //600
            drawingHeight = parseInt(sketchHeight); // 400

            // Create a new sketch object to hold data
            sketch = new Sketch();
            sketch.filename = defaultSketchFilename;
            sketch.width = drawingWidth;
            sketch.height = drawingHeight;
            sketch.layerCount = 3;

            let l = 0;
            for (l=0; l<= sketch.layerCount - 1; l++) {
                let sketchLayer = new SketchLayer();
                sketchLayer.name = 'Layer' + l.toString();
                sketchLayer.description = '';
                sketchLayer.data = null;
                sketch.layers.push(sketchLayer);
            }    

            //let jsonSketch = document.getElementById('versaSketchData');
            //jsonSketch.value = JSON.stringify(sketch);

            // Setup canvas drawing areas

            // Setup background canvas
            drawBackground = document.getElementById('drawBackground');
            drawBackground.width = drawingWidth.toString();
            drawBackground.height = drawingHeight.toString();
            drawBackground.style.width = drawingWidth.toString() + 'px';
            drawBackground.style.height = drawingHeight.toString() + 'px';
            ctx[0] = drawBackground.getContext('2d');
            ctx[0].fillStyle = gridBackgroundColour;
            ctx[0].fillRect(0, 0, drawBackground.width, drawBackground.height);

            if (defaultBackgroundImageSrc.length === 0) {
                // Display background grid
                let stepSize = gridSize; // 20
                let numRows = parseInt(drawingHeight / stepSize);
                let numCols = parseInt(drawingWidth / stepSize);
                
                let x = 0;
                let y = 0;
                let i, j = 0;

                for (i=0; i <= numCols - 1; i++) {
                    x = x + stepSize;
                    y = 0;
                    drawLine(ctx[0], x, y, x, y + drawingHeight, gridColour, 1);                        
                }

                for (j=0; j <= numRows - 1; j++) {
                    x = 0;
                    y = y + stepSize;
                    drawLine(ctx[0], x, y, x + drawingWidth, y, gridColour, 1);                        
                }
            } else {
                // Display a background image
                let backgroundImage = new Image();                
                backgroundImage.src = defaultBackgroundImageSrc;
                backgroundImage.onload = function (e)
                {
                    ctx[0].drawImage(backgroundImage,0,0, drawingWidth,drawingHeight); 
                }
            }

            // Show / hide grid or background based on default setting
            if (showGrid == false) {
                // Hide grid by setting to true and then toggle display
                showGrid = true;
                toggleGridDisplay();
            }

            // Setup highlight canvas
            highlightArea = document.getElementById('highlightArea');
            highlightArea.width = drawingWidth.toString(); // Set to same dimensions as drawing canvas
            highlightArea.height = drawingHeight.toString(); // Set to same dimensions as drawing canvas
            highlightArea.style.width = drawingWidth.toString() + 'px'; // Set to same dimensions as drawing canvas
            highlightArea.style.height = drawingHeight.toString() + 'px'; // Set to same dimensions as drawing canvas
            ctx[1] = highlightArea.getContext('2d');
            ctx[1].fillStyle = "transparent";
            ctx[1].strokeStyle = "#444";
            ctx[1].lineWidth = 1.5;
            ctx[1].lineCap = "round";
            ctx[1].fillRect(0, 0, drawingWidth, drawingHeight);  

            // Setup drawing canvas
            drawArea1 = document.getElementById('drawArea1');
            drawArea1.width = drawingWidth.toString();
            drawArea1.height = drawingHeight.toString();
            drawArea1.style.width = drawingWidth.toString() + 'px';
            drawArea1.style.height = drawingHeight.toString() + 'px';
            ctx[2] = drawArea1.getContext('2d');
            ctx[2].fillStyle = "transparent";
            ctx[2].strokeStyle = "#444";
            ctx[2].lineWidth = 1.5;
            ctx[2].lineCap = "round";
            ctx[2].fillRect(0, 0, drawingWidth, drawingHeight);

            // Store a copy of an empty drawing area. This can be used to check if a drawing area has been used (is dirty).
            emptyDrawingArea = drawArea1.toDataURL();
                             
            // Define object to target display of x and y pointer position and additional debug information
            target = {
                x: document.getElementById('x'),
                y: document.getElementById('y'),
                mode: document.getElementById('mode'),
                drawAreaNum: document.getElementById('drawAreaNum'),
                pointerData: document.getElementById('pointerData'),
                toolNum: document.getElementById('toolNum')
            };

            // Setup events
            captureEvents();

            document.getElementById('colourPicker').addEventListener("change", function(e) {
                currentColour = e.target.value;
            });

            // Display colour palettes
            setColourPalette();
            setColourPaletteHighlighter();
            
            // Initialise tools
            initialiseTools();

            this.debugWindow('Running');

        },

        toggleGrid: function () {

            toggleGridDisplay();

            let tool = null;
            tool = document.querySelectorAll('[data-grid="0"]');
            if (showGrid == true) {
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                tool[0].classList.remove('btn-icon-tool-selected');
            }
            
        },

        clearDrawing: function () {
            clearDrawingArea(2);
        },

        changeTool: function (el, tooltype) {

            // Set appropriate tool
            setTool(tooltype);

            hideToolSettings(); // Hide previous tools settings
            showToolSettings(tooltype); // Show selected tool settings

            let i = 0;
            let elements = document.querySelectorAll('[data-tool]');

            // Unselect currently selected tool
            for (i = 0; i < elements.length; i++) {
                elements[i].classList.remove('btn-icon-tool-selected');
            }

            // Select the selected item
            if (el === null) {
                // Select by item
                let tool = null;
                tool = document.querySelectorAll('[data-tool="' + tooltype.toString() + '"]');
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                // Select by element
                el.classList.add('btn-icon-tool-selected');
            }

        },

        changePenColour: function (colourIndex) {
            
            setPenColour(colourIndex);

            // Update display reflecting the colour selected
            // Prior to input type="color"
            //let el = document.getElementById('colourPreview');
            //el.style.backgroundColor = colourPalette[colourIndex].value;

            let el = document.getElementById('colourPicker');
            el.value = colourPalette[colourIndex].value;

        },

        changePenColourAsHex: function () {

            let hexColour = "#000000"; // Default
            let el = document.getElementById('colourPicker');
            hexColour = el.value;

            setPenColourAsHex(hexColour);
        },

        changePenSize: function (el, size) {

            setPenSize(size);

            let i = 0;
            // Select the appropriate pen size
            let elements = document.querySelectorAll('[data-pen-size]');

            // Unselect currently selected item
            for (i = 0; i < elements.length; i++) {
                elements[i].classList.remove('btn-icon-tool-selected');
            }

            // Select the selected item
            if (el === null) {
                // Select by item
                let tool = null;
                tool = document.querySelectorAll('[data-pen-size="' + size.toString() + '"]');
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                // Select by element
                el.classList.add('btn-icon-tool-selected');
            }

        },

        changeHighlighterColour: function (colourIndex) {
            
            setHighlighterColour(colourIndex);

            // Update display reflecting the colour selected
            let el = document.getElementById('highlightPreview');
            el.style.backgroundColor = colourPaletteHighlighter[colourIndex].value;

        },

        changeHighlighterSize: function (el, size) {

            setHighlighterSize(size * 4);

            let i = 0;
            // Select the appropriate highlighter size
            let elements = document.querySelectorAll('[data-highlighter-size]');

            // Unselect currently selected item
            for (i = 0; i < elements.length; i++) {
                elements[i].classList.remove('btn-icon-tool-selected');
            }

            // Select the selected item
            if (el === null) {
                // Select by item
                let tool = null;
                tool = document.querySelectorAll('[data-highlighter-size="' + size.toString() + '"]');
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                // Select by element
                el.classList.add('btn-icon-tool-selected');
            }

        },

        changeEraserSize: function (el, size) {
            
            setEraserSize(size);

            let i = 0;
            // Select the appropriate eraser size
            let elements = document.querySelectorAll('[data-eraser-size]');

            // Unselect currently selected item
            for (i = 0; i < elements.length; i++) {
                elements[i].classList.remove('btn-icon-tool-selected');
            }

            // Select the selected item
            if (el === null) {
                // Select by item
                let tool = null;
                tool = document.querySelectorAll('[data-eraser-size="' + size.toString() + '"]');
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                // Select by element
                el.classList.add('btn-icon-tool-selected');
            }
            
        },

        changeEraserShape: function (el, shape) {
            
            setEraserShape(shape);

            let i = 0;
            // Select the appropriate eraser shape
            let elements = document.querySelectorAll('[data-eraser-shape]');

            // Unselect currently selected item
            for (i = 0; i < elements.length; i++) {
                elements[i].classList.remove('btn-icon-tool-selected');
            }

            // Select the selected item
            if (el === null) {
                // Select by item
                let tool = null;
                tool = document.querySelectorAll('[data-eraser-shape="' + shape.toString() + '"]');
                tool[0].classList.add('btn-icon-tool-selected');
            } else {
                // Select by element
                el.classList.add('btn-icon-tool-selected');
            }

        },

        changeZoom: function (el) {

            let zoomValue = null;
            zoomValue = el.value;
            //console.log(zoomValue);

            let zl = document.getElementById('zoomLevel');
            zl.innerHTML = zoomValue.toString() + '%';

            setZoom(zoomValue);
        },

        save: function () {

            // Save image data for all layers                    
            let imageData = null;
            let ctxSource = null;
            let canvasLayer = null;
            let canvasLayerName = null; 
            let drawingLayerNum = 0;                   
            let i = 0;

            for (i=0; i<=sketch.layerCount-1; i++) {
                // Get the image data for each layer
                if (i == 0) {
                    canvasLayerName = 'drawBackground';                            
                }

                if (i == 1) {
                    canvasLayerName = 'highlightArea';                            
                }

                if (i > 1) {
                    drawingLayerNum = i - 1;
                    canvasLayerName = 'drawArea' + drawingLayerNum.toString();                            
                }

                canvasLayer = document.getElementById(canvasLayerName);
                ctxSource = canvasLayer.getContext('2d');
                imageData = ctxSource.getImageData(0, 0, drawingWidth, drawingHeight);

                // Update the sketch layer object
                sketch.layers[i].data = canvasLayer.toDataURL();
                //console.log(canvasLayer.toDataURL());
            }

            let jsonSketch = document.getElementById('versaSketchData');
            jsonSketch.value = JSON.stringify(sketch);
                            
        },

        load: function () {

            // Load and display image data for all layers    
            let canvasLayerName = null; 
            let drawingLayerNum = 0; 
            let i = 0;

            // Reset the canvas and initialise tools
            reset();
            
            // Load sketch (JSON string) from text area
            let jsonSketch = document.getElementById('versaSketchData').value;
            //console.log(jsonSketch);

            sketch = null; // Clear current sketch object (defined globally)
            // Parse the JSON string and cast to Sketch object
            sketch = JSON.parse(jsonSketch);
            //console.log(sketch);

            for (i=0; i<=sketch.layerCount-1; i++) {
                // Load the image data for the layer
                if (i == 0) {
                    canvasLayerName = 'drawBackground';     
                    
                    // This method works - not flexible if we add more layers later
                    //let canvasLayer0 = document.getElementById(canvasLayerName);
                    //let ctxSource0 = canvasLayer0.getContext('2d');

                    //let newImage0 = new Image();
                    //newImage0.src = sketch.layers[i].data;                            
                }

                if (i == 1) {
                    canvasLayerName = 'highlightArea';
                    
                    // This method works - not flexible if we add more layers later
                    //let canvasLayer1 = document.getElementById(canvasLayerName);
                    //let ctxSource1 = canvasLayer1.getContext('2d');

                    //let newImage1 = new Image();
                    //newImage1.src = sketch.layers[i].data;
                    //newImage1.onload = () => { ctxSource1.drawImage(newImage1, 0, 0, drawingWidth, drawingHeight); };
                }

                if (i > 1) {
                    drawingLayerNum = i - 1;
                    canvasLayerName = 'drawArea' + drawingLayerNum.toString();  
                    
                    // This method works - not flexible if we add more layers later
                    //let canvasLayer2 = document.getElementById(canvasLayerName);
                    //let ctxSource2 = canvasLayer2.getContext('2d');

                    //let newImage2 = new Image();
                    //newImage2.src = sketch.layers[i].data;
                    //newImage2.onload = () => { ctxSource2.drawImage(newImage2, 0, 0, drawingWidth, drawingHeight); };                            
                }

                // Must declare these here (i.e. within the for...loop), not global to this method.
                // Otherwise, end up with the eraser clearing both drawing and highlight layer.
                // Appears a timimg issue (newImage.onload) causes layer data to merge when displayed.
                let canvasLayer = document.getElementById(canvasLayerName);
                let ctxSource = canvasLayer.getContext('2d');

                let newImage = new Image();
                newImage.src = sketch.layers[i].data;
                newImage.onload = () => { ctxSource.drawImage(newImage, 0, 0, drawingWidth, drawingHeight); };
                
            }
                               
        },

        // Tools and Utilities
        debugWindow: function (debugMsg) {
            if (isDebug == true) {
                let win = document.getElementById('versaSketchDebugWindow');
                win.innerHTML = debugMsg + '</br>' + win.innerHTML;
            }
            return false;
        },

        debugWindowClear: function () {
            if (isDebug == true) {
                let win = document.getElementById('versaSketchDebugWindow');
                win.innerHTML = '';
            }
            return false;
        },

        randomNumber: function (maxValue) {
            // Generate a random number from 0 to maxValue
            let min = 0;
            let max = maxValue;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        randomNumberFromRange: function (minValue, maxValue) {
            // Generate a random number from minValue to maxValue
            let min = minValue;
            let max = maxValue;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        getRandomColor: function() {
            let letters = new Array();
            letters = '0123456789ABCDEF'.split('');
            let color = '#';
            for (let i = 0; i < 6; i++ ) {
                color += letters[Math.round(Math.random() * 15)];
            }
            return color;
        },    

        decimalToHex: function (d, padding) {
            let hex = Number(d).toString(16);
            padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

            while(hex.length < padding) {
                hex = "0" + hex;
            }

            return hex;
        }

    };

}) ();