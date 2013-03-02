//<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script>

//Variables for controlling how things look
var ctNormalHeight = 20;
var ctHighlightHeight = 25
var ctNonHighlightHeight =  20;

var ctNormalFont = "15px Helvetica"; //cocktail font height 
var ctHighlightFont = "17px Helvetica";
var ctNonHighlightFont = "15px Helvetica";

var ctNormalLineWidth = 2; //px for line width
var ctHighlightLineWidth = 4;
var ctNonHighlightLineWidth = 2;

var ctNormalLineAlpha = 1;
var ctHighlightLineAlpha = 1;
var ctNonHighlightLineAlpha = 0.3;

var ctNormalBoxAlpha = 1;
var ctHighlightBoxAlpha = 1;
var ctNonHighlightBoxAlpha = 0.1; 

var ctBoxPadding = 20; //number of pixels to the left/right of cocktail text included in box
var curviness = 0.5;

var ingNormalFillStyle = "white";
var ingHighlightFillStyle = "white";
var ingNonHighlightFillStyle = "rgba(50,50,50,1)";

var ingNormalFont = "15px Helvetica";
var ingHighlightFont = "17px Helvetica";
var ingNonHighlightFont = "15px Helvetica";

var ingTextMargin = 5; //pixels between ingredient text and start of line path
var ingNormalHeight = 15;
var ingHighlightHeight = 15;
var ingNonHighlightHeight =  15;

//Global variables

var rotation = 0;
var r = 250;
var g = 0;
var b = 0;
var ctx;
var cocktailDB = [];
var liquorDB = [];
var mixerDB = [];
var garnishDB = [];
var glassDB = [];
var cocktailList = [];
var masterGlassList = [];
var ingredientList = new IngredientList(['Liquor', 'Mixer', 'Garnish']);
var cocktailBeingDragged = null;
var draggedCocktail = null;
var ingredientSelected = null;
var canvas;
var ingOptimizationWeights = [1, 0.75];
var cocktailSelected = null;
var mouseOverReady = false;
var optimize = true;
var maxRecursiveDepth = 25;
var minPercentChange = 4;


Array.prototype.includes = function(item){
	for(var i = 0; i < this.length ; i++){
		if(this[i] == item)
			return true;
	}
	return false;
};

Array.prototype.getIndexByValue = function(item){
	for(var i = 0; i < this.length ; i++){
		if(this[i] == item)
			return i;
	}
	return -1;
};

function D2Array(){
    this.a = [];//new Array(cols);
    this.columns = 0;//cols;
    this.rows = 0;//rs;
}

D2Array.prototype.sortRow = function(r){
	var indexArray = new Array(this.columns);
	var values = new Array(this.columns);
	var c;
	//Initialize indexArray and values to sort
	for(c=0; c<this.columns; c++)
		values [c] = this.a[c][r];
	
	return sortWithIndex(values);
}
 
D2Array.prototype.addRow = function (){
    if(this.columns === 0){
        this.a.push([0]);
        this.columns = 1;
    }else{
        for(var c = 0; c<this.columns; c++)
            this.a[c].push(0);
    }
    this.rows++;
};

D2Array.prototype.sumRow = function(r){
    var s = 0;
    for(var c = 0; c<this.columns; c++)
        s = s + this.a[c][r];
    return s;
};

D2Array.prototype.sumColumn = function(c){
    var s = 0;
    for(var r = 0; r<this.columns; r++)
        s = s + this.a[c][r];
    return s;
};

D2Array.prototype.addColumn = function(){
    this.a.push(new Array(this.rows));
    this.columns++;
    for(var r = 0; r<this.rows; r++)
        this.a[this.columns-1][r] = 0;
};

D2Array.prototype.grab = function(r,c){
    if((r>=0 && r<this.rows) && (c>=0 && c<this.columns))
        return this.a[c][r];
    return null;
};

D2Array.prototype.put = function(r,c, val){
    if((r>=0 && r<this.rows) && (c>=0 && c<this.columns))
        this.a[c][r] = val;
};

D2Array.prototype.toString = function(){
    var str = "D2Array Output\n" + 'r = ' + this.rows + ' c = ' + this.columns + '\n';
    var r, c;
    for (r = 0; r<this.rows; r++){
        for(c = 0; c<this.columns; c++){
            str = str + this.a[c][r] + ',';
        }
        str = str + '\n';
    }
    return str;
};

// types is an array of types of ingredients that will be added
function IngredientList(types){
	this.types = types;
	this.occuranceOfType = new Array(types.length);
	for(var i=0; i<this.occuranceOfType.length; i++)
		this.occuranceOfType[i] = 0;
    this.ingredients = [];	//an array of the ingredient names
    this.occurances = new D2Array(1,1);	//an array accumulating the occurances of simultaneous 
    this.position = []; //this is the x,y coordinate where the ingredient is drawn 
    this.order = []; // order[i] holds the integer position of ingredient [i]
	this.type = []; //holds the type of ingredient that ingredient[i] is
	this.highlightState = [];
	this.normalSize = []; 
	this.highlightSize = [];
	this.nonHighlightSize = [];
	this.boundingBox = [];
}

//item is the item name
//type is the type of item
IngredientList.prototype.addItem = function(item, type){
    var i;
    var exists = false;
    var index;
    for (i = 0; i < this.ingredients.length; i++){
        if (this.ingredients[i] == item){
            exists = true;
            index = i;
            break;
        }
    }
    if(!exists){
        this.ingredients.push(item);
		this.type.push(type);
		this.order.push(this.getNumOfType(type));
		this.incrementType(type);
        this.occurances.addColumn();
        this.occurances.addRow();
        this.position.push([0,0]);
        index = this.ingredients.length-1;
		this.highlightState.push('normal');
		ctx.fillStyle = ingNormalFillStyle;
		ctx.font = ingNormalFont;
		this.normalSize.push([ctx.measureText(item).width, ingNormalHeight]);
		ctx.fillStyle = ingHighlightFillStyle;
		ctx.font = ingHighlightFont;
		this.highlightSize.push([ctx.measureText(item).width, ingHighlightHeight]);
		ctx.font = ingNonHighlightFont;
		ctx.fillStyle = ingNonHighlightFillStyle;
		this.nonHighlightSize.push([ctx.measureText(item).width, ingNonHighlightHeight]);
		this.boundingBox = [];
    }
    return index;
};

IngredientList.prototype.incrementType = function(type){
	for (var t = 0; t<this.types.length; t++){
		if (type == this.types[t]){
			this.occuranceOfType[t]++;
			break;
		}
	}
};

IngredientList.prototype.getNumOfType = function(type){
	for (var t = 0; t<this.types.length; t++){
		if (type == this.types[t]){
			return this.occuranceOfType[t];
		}
	}
	return -1;
};

IngredientList.prototype.getPosition = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.position[i];
    return null;
};

IngredientList.prototype.setHighlightState = function(indexes, state){
	for(var i = 0; i<indexes.length; i++){
		this.highlightState[indexes[i]] = state;
		this.updateBoundingBox(indexes[i]);
	}
};

//Pass in a cocktail
IngredientList.prototype.addItems = function(c){
    	
    var i, j, iLength;
	iLength = c.liquors.length + c.mixers.length + c.garnishes.length;
    var indexes = new Array();
    for(i=0; i<c.liquors.length; i++){
        indexes.push(this.addItem(c.liquors[i], 'Liquor'));  
    }
	
	for(i=0; i<c.mixers.length; i++){
        indexes.push(this.addItem(c.mixers[i], 'Mixer'));  
    }
	
	for(i=0; i<c.garnishes.length; i++){
        indexes.push(this.addItem(c.garnishes[i], 'Garnish'));  
    }
	
    
    for(i=0; i<iLength; i++){
        this.occurances.put(indexes[i], indexes[i], this.occurances.grab(indexes[i], indexes[i])+1);        
        for(j=i+1; j<iLength; j++){
            this.occurances.put(indexes[i], indexes[j], this.occurances.grab(indexes[i], indexes[j])+1);
            this.occurances.put(indexes[j], indexes[i], this.occurances.grab(indexes[j], indexes[i])+1);
        }
    }
};

//types is an array of ingredient types to include
//weights is an array of length 2 - [0] has the weight factor if the two items are the same, [1] has the weight factor if the items are different
IngredientList.prototype.calcEfficiency = function(types, weights){
	var effSum = 0;
	var i, j, w; // iterators
	
	for(i = 0; i<this.ingredients.length; i++){
		if (types.includes(this.type[i])){
			for(j = i+1; j < this.ingredients.length; j++){
				if (types.includes(this.type[j])){
					(this.type[i] == this.type[j]) ? w=weights[0] : w=weights[1]; 
					effSum = effSum + Math.pow(this.order[i] - this.order[j],2)*Math.pow(this.occurances.grab(i,j),2)*w;
				}
			}
		}
	}
	return effSum
};

IngredientList.prototype.calcEfficiencyR = function(order, types, weights){
	var effSum = 0;
	var i, j, w; // iterators
	
	for(i = 0; i<this.ingredients.length; i++){
		if (types.includes(this.type[i])){
			for(j = i+1; j < this.ingredients.length; j++){
				if (types.includes(this.type[j])){
					(this.type[i] == this.type[j]) ? w=weights[0] : w=weights[1]; 
					effSum = effSum + Math.pow(order[i] - order[j],2)*Math.pow(this.occurances.grab(i,j),2)*w;
				}
			}
		}
	}
	return effSum
};

IngredientList.prototype.getIndexesOfType = function(type){
	var indexes = [];//new Array(this.getNumOfType(type));
	//var j = 0;
	for(var i = 0; i<this.ingredients.length; i++){
		if (this.type[i] == type){
			indexes.push(i);
		}
	}
	return indexes;
};
 
IngredientList.prototype.setOrder = function(){
    this.order = new Array(this.ingredients.length);
    var i, max, maxI;
    max = 0;
	
    var posToFill; //2 position array which holds the next positions that need to be filled
    
    var used = new Array(this.ingredients.length);

    for (i=0; i<this.ingredients.length; i++){
        this.order[i] = -1;
        used[i] = false;
        if (this.occurances.grab(i,i) > max){
            max = this.occurances.grab(i,i);
            maxI = i;
        }
    }
    
	used[maxI] = true;
	
    if(isEven(this.ingredients.length)){
        this.order[(this.ingredients.length-2)/2] = maxI;
        posToFill = [(this.ingredients.length-2)/2-1,(this.ingredients.length)/2];
    }else{
        this.order[(this.ingredients.length-1)/2] = maxI;
        posToFill = [(this.ingredients.length-1)/2-1,(this.ingredients.length - 1)/2+1]; 
    }
    
	var sortLResults, sortUResults, lUnusedIndex, uUnusedIndex, r;
	var oobV = new Array(this.ingredients.length);
	var oobI = new Array(this.ingredients.length);
	for (i=0; i<this.ingredients.length; i++){
		oobV[i] = -1;
		oobI[i] = -1;
	}
	
	var oob = {value:oobV, index:oobI};
	
    while(posToFill[0] > -1 || posToFill[1] < this.ingredients.length){
        
		if(posToFill[0] >-1){
			sortLResults = this.occurances.sortRow(this.order[posToFill[0]+1]);
		} else {
			sortLResults = oob;
		}
		
		if(posToFill[1] < this.ingredients.length){
			sortUResults = this.occurances.sortRow(this.order[posToFill[1]-1]);
		}else{
			sortUResults = oob;
		}
		
		//Find the index of the most occuring indgredient that hasn't already been placed
		lUnusedIndex=0;
		while(used[sortLResults.index[lUnusedIndex]])
			lUnusedIndex++;
		
		uUnusedIndex=0;
		while(used[sortUResults.index[uUnusedIndex]])
			uUnusedIndex++
		
		if(sortLResults.index[lUnusedIndex] == sortUResults.index[uUnusedIndex]){ // if the best result is the same for both unfilled positions
			//randomly assign ingredient to position
			r = getRandomInt(0,1);
			this.order[posToFill[r]] = sortLResults.index[lUnusedIndex];
			used[sortLResults.index[lUnusedIndex]] = true;
			if(r==1)
				posToFill[1]++;
			else
				posToFill[0]--;
		}else{
			if(sortLResults.value[lUnusedIndex] == sortUResults.value[uUnusedIndex]){ // if the results have the same value
				//randomly choose whether to assign lower or upper value
				r = getRandomInt(0,1);
				if (r==1){
					this.order[posToFill[1]] = sortUResults.index[uUnusedIndex];
					used[sortUResults.index[uUnusedIndex]] = true;
					posToFill[1]++;
				} else {
					this.order[posToFill[0]] = sortLResults.index[lUnusedIndex];
					used[sortLResults.index[lUnusedIndex]] = true;
					posToFill[0]--;
				}
			} else {
				if(sortLResults.value[lUnusedIndex] > sortUResults.value[uUnusedIndex]){ //if the lower value is greater than the upper one
					this.order[posToFill[0]] = sortLResults.index[lUnusedIndex];
					used[sortLResults.index[lUnusedIndex]] = true;
					posToFill[0]--;
				} else {
					this.order[posToFill[1]] = sortUResults.index[uUnusedIndex];
					used[sortUResults.index[uUnusedIndex]] = true;
					posToFill[1]++;
				}
			}
		}
    }
};

IngredientList.prototype.randomizeOrder = function(type){
	var tIndexes = this.getIndexesOfType(type);
	var tArray = new Array(tIndexes.length);
	var i;
	for(i = 0; i<tArray.length; i++)
		tArray[i] = Math.random();
	var sorted = sortWithIndex(tArray);
	
	for(i = 0; i <tIndexes.length; i++)
		this.order[tIndexes[i]] = sorted.index[i];
}
    
IngredientList.prototype.getIndexByName = function(item){
    for (var i=0; i<this.ingredients.length; i++){
        if (this.ingredients[i] == item)
            return i;
    }
    return null;
};

IngredientList.prototype.setPositionByName = function(item, pos){
    var i = this.getIndexByName(item);
    if (i!== null)
        this.position[i] = pos.slice(0);
};

IngredientList.prototype.getPositionByName = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.position[i];
};

IngredientList.prototype.getBoundingBoxByName = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.boundingBox[i];
};

IngredientList.prototype.setPositionByIndex = function(index, pos){
    if (index >= 0 && index < this.position.length)
        this.position[index] = pos.slice(0);
};

IngredientList.prototype.setListPositions = function(type,xRange, yRange){
    var midX = (xRange[0] + xRange[1])/2;
    var midY = (yRange[0] + yRange[1])/2;
    var totX = xRange[1] - xRange[0];
    var totY = yRange[1] - yRange[0];
    var elements = this.getNumOfType(type);
    var pos;
    var i;
    
 	
	for (i=0; i<this.ingredients.length; i++){
		if(this.type[i] == type){
			this.position[i] = [Math.round(xRange[0]+totX/elements*this.order[i] + totX/elements/2), 
				Math.round(yRange[0]+totY/elements*this.order[i]+totY/elements/2)];
			this.updateBoundingBox(i);			
		}
	}	
};

IngredientList.prototype.toString = function(){
    var str = "";
    for(var i =0; i<this.ingredients.length; i++){
        str = str+this.ingredients[i] + ' : ' + this.normalSize[i] +' : ' + this.highlightSize[i] + '\n';
    }
    return str;
};

IngredientList.prototype.listLength = function(){
    return this.ingredients.length;
};

IngredientList.prototype.highlightIngredients = function(items){
	for (var i = 0; i<this.ingredients.length; i++){
		if(items.includes(this.ingredients[i])){
			this.highlightState[i]="highlight";
			this.updateBoundingBox(i);
		} else{
			this.highlightState[i]="nonhighlight";
			this.updateBoundingBox(i);
		}
	}
};

IngredientList.prototype.updateBoundingBox = function(i){
	var w, h;
	if(this.type[i] == 'Liquor'){	
		if(this.highlightState[i] == "normal"){
			w = this.normalSize[i][0];
			h = this.normalSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0]), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0] + w), Math.round(this.position[i][1] + h/2)];
		} else if (this.highlightState[i] == "highlight"){	
			w = this.highlightSize[i][0];
			h = this.highlightSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0]), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0] + w), Math.round(this.position[i][1] + h/2)];
		} else if (this.highlightState[i] == "nonhighlight") {	
			w = this.nonHighlightSize[i][0];
			h = this.nonHighlightSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0]), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0] + w), Math.round(this.position[i][1] + h/2)];
		}
	}else if(this.type[i] == 'Mixer'){ //the case where it is a mixer
		if(this.highlightState[i] == "normal"){
			w = this.normalSize[i][0];
			h = this.normalSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0] - w), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0]), Math.round(this.position[i][1] + h/2)];
		} else if (this.highlightState[i] == "highlight"){	
			w = this.highlightSize[i][0];
			h = this.highlightSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0] - w), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0]), Math.round(this.position[i][1] + h/2)];
		} else if (this.highlightState[i] == "nonhighlight") {	
			w = this.nonHighlightSize[i][0];
			h = this.nonHighlightSize[i][1];
			this.boundingBox[i] = [Math.round(this.position[i][0] - w), Math.round(this.position[i][1] - h/2), 
				Math.round(this.position[i][0]), Math.round(this.position[i][1] + h/2)];
		}
	}
};

function Cocktail(name){
    this.name = name;
    this.liquors = [];
	this.lAmount = [];
    this.mixers = [];
	this.mAmount = [];
    this.garnishes = [];
    this.glass = "";
    this.position = [];
	this.color = "";
	this.boundingBox = new Array(4);
	this.highlightState = 'normal';
	ctx.font = ctNormalFont;
	this.normalSize = [ctx.measureText(name).width, ctNormalHeight];
	ctx.font = ctHighlightFont;
	this.highlightSize = [ctx.measureText(name).width, ctHighlightHeight];
	ctx.font = ctNonHighlightFont;
	this.nonHighlightSize = [ctx.measureText(name).width, ctNonHighlightHeight];
}

Cocktail.prototype.setHighlightState = function(state){
	if(this.highlightState == state)
		return 1;
	this.highlightState = state;
	this.updateBoundingBox();
};

Cocktail.prototype.updateBoundingBox = function(){
	var w, h;
	if(this.highlightState == "normal"){
		w = this.normalSize [0];
		h = this.normalSize [1];
		this.boundingBox = [this.position[0] - w/2-ctBoxPadding, this.position[1] - h/2, this.position[0] + w/2+ctBoxPadding, this.position[1] + h/2];
	} else if (this.highlightState == "highlight"){	
		w = this.highlightSize [0];
		h = this.highlightSize [1];
		this.boundingBox = [this.position[0] - w/2-ctBoxPadding, this.position[1] - h/2, this.position[0] + w/2+ctBoxPadding, this.position[1] + h/2];
	} else if (this.highlightState == "nonhighlight") {	
		w = this.nonHighlightSize [0];
		h = this.nonHighlightSize [1];
		this.boundingBox = [this.position[0] - w/2-ctBoxPadding, this.position[1] - h/2, this.position[0] + w/2+ctBoxPadding, this.position[1] + h/2];
	}
};

Cocktail.prototype.toString = function(){
	var str = this.name + ' Pos: '+ this.position + "highlight: " + this.highlightState + '\n';
	/*
	var l;
	for(l = 0; l<this.liquors.length; l++){
		str = str+this.liquors[l] + ': ' + this.lAmount[l] + '\n';
	}
	for(l = 0; l<this.mixers.length; l++){
		str = str+this.mixers[l] + ': ' + this.mAmount[l] + '\n';

	}
	str = str + this.garnishes;
	*/
	return str;
};

Cocktail.prototype.hasLiquor = function(liquorName){
    var l;
    for(l = 0; l<this.liquors.length; l++){
        if (this.liquors[l] == liquorName)
            return true;
    }
    return false;
};

Cocktail.prototype.hasMixer = function(mixerName){
    var m;
    for(m in this.mixers){
        if (m == mixerName)
            return true;
    }
    return false;
};

$(document).ready(function() {
	


	canvas = document.getElementById('drink-canvas');  
	ctx = canvas.getContext('2d'); 
	ctx.canvas.width  = window.innerWidth*0.95;
	ctx.canvas.height = window.innerHeight*0.95;
	
	var context=canvas.getContext('2d');
	loadCocktailDB();
	
	//Load cocktails 
	loadCocktails();
	
    //Generate list of ingredients
    $.each(cocktailList, function(index, c){
        ingredientList.addItems(c);
    });
			
	var cH, cW;
	cH = canvas.height;	
	cW = canvas.width;	
	var i, j;
	
	// register event handlers
	canvas.onmousedown = mouseClickInDrinkCanvas;
	canvas.onmousemove = mouseMovingInDrinkCanvas;
	canvas.onmouseup = mouseUpInDrinkCanvas;
	canvas.onmouseout = mouseUpInDrinkCanvas;
	
	var cH, cW, i, j;
	cH = canvas.height;	
	cW = canvas.width;
	
	ingredientList.randomizeOrder('Liquor');
	ingredientList.randomizeOrder('Mixer');
	var mIndexes = ingredientList.getIndexesOfType('Mixer');
	var lIndexes = ingredientList.getIndexesOfType('Liquor');	

	ingredientList.setListPositions('Liquor',[5,5], [5,cH-5]);
	ingredientList.setListPositions('Mixer', [cW-5, cW-5], [5,cH-5]);
	
	optimizeCocktailPositions();
	
	drawDrinkCanvas();
	
	console.log(ingredientList.toString());
	
	var color ={r:250, g:250, b:250};
	drawBoundingBox([cW/2-200, cH/2-100, cW/2+200, cH/2+100], color, 0.9);
	ctx.fillStyle = "black";
	ctx.textAlign = "center";
	ctx.fillText("Optimizing drink layout...\n This may take a minute.", cW/2, cH/2);
	
	setTimeout(setElementPositions, 50);
});

function setElementPositions(){
	mouseOverReady = false;
	var cH, cW, i, j;
	cH = canvas.height;	
	cW = canvas.width;
	
	ingredientList.randomizeOrder('Liquor');
	ingredientList.randomizeOrder('Mixer');
	var mIndexes = ingredientList.getIndexesOfType('Mixer');
	var lIndexes = ingredientList.getIndexesOfType('Liquor');	
	
	if(optimize){
		var effOrder = optimizeIngredientOrderR(ingredientList.order.slice(0), lIndexes, mIndexes, ingredientList.calcEfficiency(['Liquor', 'Mixer'], ingOptimizationWeights), 0);
		//return {order:iOrder, effNum: newEffNum, depth:rDepth};
		for(i=0; i<ingredientList.ingredients.length; i++)
			ingredientList.order[i] = effOrder.order[i];
		console.log("Selected EffNum = " + effOrder.effNum + ", Depth = " + effOrder.depth);
	}	
	mouseOverReady = true;
	
	//Calculate actual x,y positions for ingredients
	ingredientList.setListPositions('Liquor',[5,5], [5,cH-5]);
	ingredientList.setListPositions('Mixer', [cW-5, cW-5], [5,cH-5]);
	optimizeCocktailPositions();
	
	drawDrinkCanvas();
}


function drawDrinkCanvas(){
	ctx.clearRect(0,0,canvas.width, canvas.height);
	writeCocktailsAndPaths();
	writeIngredientText();
}

function loadCocktailDB(){
	var keyVals, keys, vals;
	var tempI, str, t, ci, c;
	
		//go through the json feed and extract all the entries
	if(typeof(drinkJSON) != 'undefined'){
		for (var i = 0; i < drinkJSON.feed.entry.length; i++) {
			var entry = drinkJSON.feed.entry[i];
			
			keyVals = entry.content.$t.split(',');
			keys = new Array(keyVals.length);
			vals = new Array(keyVals.length);
			
			str ="";
			for(var k=0; k<keyVals.length; k++){
				t = keyVals[k].split(':');
				keys[k] = t[0];
				//remove leading space if it exists
				if(keys[k].indexOf(" ") == 0)
					keys[k] = keys[k].substring(1);
				vals[k] = t[1];
				//remove leading space if it exists
				if(vals[k].indexOf(" ") == 0)
					vals[k] = vals[k].substring(1);
				str = str + '"'+keys[k] +'": "'+ vals[k] + '", ';
			}
			
			//drinkName	preferredIngredient	ingredientAmount	ingredientType	alternateIngredient
			
			tempI = jQuery.parseJSON('{'+str + '"drinkname":"'+ entry.title.$t +'"}');
			
			c=0;
			ci = -1;
			
			while (ci == -1 && c<cocktailDB.length){
				if(cocktailDB[c].name == tempI.drinkname){
					ci = c;
				}
				c++;
			}		
			
			if(ci == -1){	//cocktail doesn't exist
				cocktailDB.push(new Cocktail(tempI.drinkname));
				ci = cocktailDB.length-1;
			}

			if(tempI.ingredienttype=='Liquor'){
				cocktailDB[ci].liquors.push(tempI.preferredingredient);
				cocktailDB[ci].lAmount.push(tempI.ingredientamount);
				if(!liquorDB.includes(tempI.preferredingredient));
					liquorDB.push(tempI.preferredingredient);
			}
			if(tempI.ingredienttype=='Mixer'){
				cocktailDB[ci].mAmount.push(tempI.ingredientamount);	
				cocktailDB[ci].mixers.push(tempI.preferredingredient);
				if(!mixerDB.includes(tempI.preferredingredient));
					mixerDB.push(tempI.preferredingredient);
			}
			if(tempI.ingredienttype=='Garnish'){
				cocktailDB[ci].garnishes.push(tempI.preferredingredient);
				if(!liquorDB.includes(tempI.preferredingredient));
					garnishDB.push(tempI.preferredingredient);
			}
			if(tempI.ingredienttype=='Glass'){
				cocktailDB[ci].glas = tempI.preferredingredient;	
				if(!liquorDB.includes(tempI.preferredingredient));
					glassDB.push(tempI.preferredingredient);
			}
		}
	}else{
	    //Don't do anything
   
	}
}

// start dragging
function mouseClickInDrinkCanvas(e) {
	e = MousePos(e);
	var dx, dy;
	
	//Check to see if the click happened in a cocktail bounding box
	for (var c = 0; c<cocktailList.length; c++) {
		if(mouseInBox(e, cocktailList[c].boundingBox)){
			cocktailBeingDragged = true;
			cocktailList[c].setHighlightState("highlight");
			draggedCocktail = c;
			canvas.style.cursor = "move";
			c<cocktailList.length;
			break; //break out of the for loop if mouse over cocktail
		}
	}
	if(draggedCocktail !=null){
		for (var c = 0; c<cocktailList.length; c++){
			if (c!=draggedCocktail)
				cocktailList[c].setHighlightState("nonhighlight");
		}
	}
}

//Check if mouse is within a bounding box
function mouseInBox(e, box){
	if(typeof(box) == "undefined")
		return false;
	if(e.x>box[0] && e.x<box[2] && e.y > box[1] && e.y < box[3]){
		return true;
	}
	return false;
}	

// dragging
function mouseMovingInDrinkCanvas(e) {
	e = MousePos(e);
	
	//Check if currently there is a cocktail being dragged
	if (draggedCocktail != null) {	
		cocktailList[draggedCocktail].position = [e.x, e.y];
		cocktailList[draggedCocktail].updateBoundingBox();
		drawDrinkCanvas();
		return;
	} else {	//The case where the mouse is moved but we aren't dragging a cocktail	
		//check if the mouse is still in a previously selected cocktail bounding box 
		if((cocktailSelected != null) && mouseInBox(e, cocktailList[cocktailSelected].boundingBox)){
			return;	//no changes
		}
		
		//check if the mouse is still in a previously selected ingredient bounding box
		if((ingredientSelected != null) && mouseInBox(e, ingredientList.boundingBox[ingredientSelected]))
			return;	//no changes

		//the mouse isn't where it was previously, so we need to check if it is over cocktail or ingredient
		for (var c = 0; c<cocktailList.length; c++) {
			if(mouseInBox(e, cocktailList[c].boundingBox)){	//the mouse is over a cocktail
				cocktailSelected = c;
				cocktailList[c].setHighlightState("highlight");				
				//Go through all other cocktails and nonhighlight them
				for(var b = 0; b<cocktailList.length; b++){
					if(b!= cocktailSelected){
						cocktailList[b].setHighlightState("nonhighlight");
					}
				}
				ingredientList.highlightIngredients(cocktailList[cocktailSelected].liquors.concat(cocktailList[cocktailSelected].mixers));
				drawDrinkCanvas();
				return;
			}
		}

		//check if the mouse is in ingredient bounding box
		for (var i = 0; i<ingredientList.ingredients.length; i++) {
			if(mouseInBox(e, ingredientList.boundingBox[i])){	//the mouse is over an ingredient
				ingredientSelected = i;
				ingredientList.setHighlightState([i], "highlight");
				
				//Go through all other cocktails and nonhighlight them
				for(var j = 0; j<ingredientList.ingredients.length; j++){
					if(j!= ingredientSelected){
						ingredientList.setHighlightState([j], "nonhighlight");
					}
				}
				
				//go through and highlight all cocktails that include this ingredient
				for(var b = 0; b<cocktailList.length; b++){
					if(cocktailList[b].liquors.includes(ingredientList.ingredients[ingredientSelected]) 
							|| cocktailList[b].mixers.includes(ingredientList.ingredients[ingredientSelected])){
						cocktailList[b].setHighlightState("highlight");
					} else {
						cocktailList[b].setHighlightState("nonhighlight");
					}
				}				
				drawDrinkCanvas();
				return;
			}
		}
		
		//If this far, it means that either nothing has changed OR nothing is selected
		if(cocktailSelected == null && ingredientSelected == null){
			return;	//nothing has changed
		}
		
		for(var x = 0; x<cocktailList.length; x++){
			cocktailList[x].setHighlightState('normal');
		}
		
		for(var y = 0; y<ingredientList.ingredients.length; y++){
			ingredientList.setHighlightState([y], 'normal');
		}
		
		
		cocktailSelected = null;
		ingredientSelected = null;
		
		drawDrinkCanvas();		
	}
}
		
// end dragging
function mouseUpInDrinkCanvas(e) {
	e = MousePos(e);
	//cocktailBeingDragged = false;
	//cocktailList[draggedCocktail].position = [e.x, e.y];
	if(draggedCocktail!=null) {
		pos = cocktailList[draggedCocktail].position;		
		cocktailList[draggedCocktail].updateBoundingBox();
	}
	draggedCocktail = null;
	canvas.style.cursor = "default";
}

// event parser
function MousePos(event) {
	event = (event ? event : window.event);
	return {
		x: event.pageX - canvas.offsetLeft,
		y: event.pageY - canvas.offsetTop
	}
}

function writeCocktailsAndPaths(){
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
    var ingPos, alpha, tempFont, ctWidth;
	
	var selectedCocktails = [];
    for(c=0; c<cocktailList.length; c++){	//go through all cocktails
		if(cocktailList[c].highlightState != "highlight"){	//draw curves for unhighlighted cocktails
			if(cocktailList[c].highlightState == "normal"){
				ctx.lineWidth = ctNormalLineWidth;
				alpha = ctNormalLineAlpha;
				tempFont = ingNormalFont;
			} else {
				ctx.lineWidth = ctNonHighlightLineWidth;
				alpha = ctNonHighlightLineAlpha;
				tempFont = ingNonHighlightFont;
			}
			
			for(i=0; i<cocktailList[c].liquors.length; i++){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, alpha);
				ingPos = ingredientList.getBoundingBoxByName(cocktailList[c].liquors[i]);
				drawSCurve(ingPos[2] + ingTextMargin, (ingPos[1]+ingPos[3])/2, 
					cocktailList[c].boundingBox[0]-ingTextMargin, (cocktailList[c].boundingBox[1]+cocktailList[c].boundingBox[3])/2,
					'h', curviness);
			}  
					
			for(i=0; i<cocktailList[c].mixers.length; i++){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, alpha);
				ingPos = ingredientList.getBoundingBoxByName(cocktailList[c].mixers[i]);
				drawSCurve(cocktailList[c].boundingBox[2]+ingTextMargin, (cocktailList[c].boundingBox[1]+cocktailList[c].boundingBox[3])/2,
					ingPos[0] - ingTextMargin, (ingPos[1]+ingPos[3])/2,
					'h', curviness);
			}	 
		}else{
			selectedCocktails.push(c);
		}
	}
	
	
	ctx.lineWidth = ctHighlightLineWidth;
	alpha = ctHighlightLineAlpha;	
	ctx.font = ingHighlightFont;
	for(var cc = 0; cc<selectedCocktails.length; cc++){ //draw curves for highlighted cocktails
		c = selectedCocktails[cc];
		for(i=0; i<cocktailList[c].liquors.length; i++){
			if(ingredientList.highlightState[ingredientList.getIndexByName(cocktailList[c].liquors[i])] == "highlight"){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, ctHighlightLineAlpha);
				ctx.lineWidth = ctHighlightLineWidth;
			} else {
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, ctNonHighlightLineAlpha);
				ctx.lineWidth = ctNonHighlightLineWidth;
			}
			ingPos = ingredientList.getBoundingBoxByName(cocktailList[c].liquors[i]);
			drawSCurve(ingPos[2] + ingTextMargin, (ingPos[1]+ingPos[3])/2, 
				cocktailList[c].boundingBox[0]-ingTextMargin, (cocktailList[c].boundingBox[1]+cocktailList[c].boundingBox[3])/2,
				'h', curviness);
		}
			
		for(i=0; i<cocktailList[c].mixers.length; i++){
			if(ingredientList.highlightState[ingredientList.getIndexByName(cocktailList[c].mixers[i])] =="highlight"){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, ctHighlightLineAlpha);
				ctx.lineWidth = ctHighlightLineWidth;
			} else {
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, ctNonHighlightLineAlpha);
				ctx.lineWidth = ctNonHighlightLineWidth;
			}
			ingPos = ingredientList.getBoundingBoxByName(cocktailList[c].mixers[i]);
			drawSCurve(cocktailList[c].boundingBox[2]+ingTextMargin, (cocktailList[c].boundingBox[1]+cocktailList[c].boundingBox[3])/2,
				ingPos[0] - ingTextMargin, (ingPos[1]+ingPos[3])/2,
				'h', curviness);		
		}
	}
		
		
	//Draw bounding boxes and text for all cocktails
	for(c = 0; c < cocktailList.length; c++){
		if(cocktailList[c].highlightState == "normal"){
			ctx.font = ctNormalFont;
			drawBoundingBox(cocktailList[c].boundingBox, cocktailList[c].color, ctNormalBoxAlpha);
		}else if (cocktailList[c].highlightState == "highlight"){
			ctx.font = ctHighlightFont;
			drawBoundingBox(cocktailList[c].boundingBox, cocktailList[c].color, ctHighlightBoxAlpha);
		} else if (cocktailList[c].highlightState == "nonhighlight"){
			ctx.font = ctNonHighlightFont;
			drawBoundingBox(cocktailList[c].boundingBox, cocktailList[c].color, ctNonHighlightBoxAlpha);
		}
		ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.fillText(cocktailList[c].name, cocktailList[c].position[0], cocktailList[c].position[1]);
	}			
}


//Recursive function to optimize ingredient layout
function optimizeIngredientOrderR(iOrder, lIndexes, mIndexes, oldEffNum, rDepth){
	
	
	var initialEffNum = oldEffNum;
	var newEffNum;// = ingredientList.calcEfficiency(['Liquor', 'Mixer'], weights);
	var tempO;
	var rIndex;
	var oOrder = iOrder.slice(0);
		
	//go through liquors trying random swaps
	for(i = 0; i<lIndexes.length; i++){
		rIndex = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - lIndexes.length+rDepth)), Math.max(Math.min(i+1,lIndexes.length), Math.min(lIndexes.length-1, i+lIndexes.length-rDepth)));
		tempO = iOrder[lIndexes[rIndex]];
		iOrder[lIndexes[rIndex]] = iOrder[lIndexes[i]];
		iOrder[lIndexes[i]] = tempO;
		newEffNum = ingredientList.calcEfficiencyR(iOrder, ['Liquor', 'Mixer'], ingOptimizationWeights);
		if((newEffNum < oldEffNum) || (newEffNum == oldEffNum && Math.random()>0.5)){
			oldEffNum = newEffNum;
		}else{
			tempO = iOrder[lIndexes[rIndex]];
			iOrder[lIndexes[rIndex]] = iOrder[lIndexes[i]];
			iOrder[lIndexes[i]] = tempO;
			newEffNum = oldEffNum;
		}
	}	
	
	//go through mixers
	for(i = 0; i<mIndexes.length; i++){
		rIndex = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - mIndexes.length+rDepth)), Math.max(Math.min(i+1,mIndexes.length), Math.min(lIndexes.length-1, i+mIndexes.length-rDepth)));
		tempO = iOrder[mIndexes[rIndex]];
		iOrder[mIndexes[rIndex]] = iOrder[mIndexes[i]];
		iOrder[mIndexes[i]] = tempO;
		newEffNum = ingredientList.calcEfficiencyR(iOrder, ['Liquor', 'Mixer'], ingOptimizationWeights);
		if(newEffNum < oldEffNum){
			oldEffNum = newEffNum;
		}else{
			tempO = iOrder[mIndexes[rIndex]];
			iOrder[mIndexes[rIndex]] = iOrder[mIndexes[i]];
			iOrder[mIndexes[i]] = tempO;
			newEffNum = oldEffNum;
		}
	}	
	
	var eff1, eff2;
	if(rDepth <= maxRecursiveDepth && newEffNum < initialEffNum*(100-minPercentChange)/100) {
		eff1 = optimizeIngredientOrderR(iOrder.slice(0), lIndexes, mIndexes, newEffNum, rDepth+1);
		eff2 = optimizeIngredientOrderR(iOrder.slice(0), lIndexes, mIndexes, newEffNum, rDepth+1);
		if(eff1.effNum < eff2.effNum){
			return eff1;
		} else {
			return eff2;
		}
	}
	//alert(newEffNum);
	console.log("EffNum = " + initialEffNum + ", Depth = " + rDepth);
	return {order:oOrder, effNum:initialEffNum, depth:rDepth};
}

function optimizeCocktailPositions(){
	//Set cocktail positions
		
	
	var c, xPos, yPosL, yPosM;
	var allY = new Array(cocktailList.length);
	var allX = new Array(cocktailList.length);
	var tWidth;
	
	var h = canvas.height;
	
	for (c = 0; c<cocktailList.length; c++){
		xPos = 0;
		yPosL = 0;
		yPosM = 0;
		
		for(var cl = 0; cl<cocktailList[c].liquors.length; cl++){
			yPosL = yPosL + ingredientList.getPositionByName(cocktailList[c].liquors[cl])[1];
		}
		yPosL = yPosL/cocktailList[c].liquors.length;	
		
		for(var cm = 0; cm<cocktailList[c].mixers.length; cm++){
			yPosM = yPosM + ingredientList.getPositionByName(cocktailList[c].mixers[cm])[1];
		}
		
		yPosM = yPosM/cocktailList[c].mixers.length;
		
		if(cocktailList[c].mixers.length>0 && cocktailList[c].liquors.length > 0)
			allY[c]= (yPosM + yPosL)/2;	
		else if ( cocktailList[c].mixers.length === 0)
			allY[c]= (yPosL);
		else if ( cocktailList[c].liquors.length ===0)
			allY[c]= (yPosM);
	}
	
	var ySorted = sortWithIndex(allY);
	
	var str1 = "";
	var str2 = "";
	
	for (c = 0; c<cocktailList.length; c++){
		allY[ySorted.index[c]] = (cocktailList.length-c-0.5)*h/cocktailList.length;
		cocktailList[ySorted.index[c]].color = returnRGB(c,cocktailList.length, 1);
	}
	
	var minX, maxX, xRank, xRange;
	minX = canvas.width/2-1;
	maxX = canvas.width/2+1;
	xRange = maxX-minX;
	xRank = new Array(cocktailList.length);
	
	for (c = 0; c<cocktailList.length; c++){
		xRank[c] = Math.pow(cocktailList[c].mixers.length,2) - Math.pow(cocktailList[c].liquors.length,2);
	}
	
	xRank = sortWithIndex(xRank);
	
	for (c = 0; c<cocktailList.length; c++){
		allX[xRank.index[c]] = (cocktailList.length-c-0.5)*xRange/cocktailList.length + minX;
	}
	
	for (c = 0; c<cocktailList.length; c++){
		cocktailList[c].position = [Math.round(allX[c]), Math.round(allY[c])];
		cocktailList[c].updateBoundingBox();
	}
}

function loadCocktails(){
	for(var c = 0; c<cocktailDB.length; c++){
		cocktailList.push(cocktailDB[c]);
	}
	
	//execute this code as filler when cocktail DB not available
	if(cocktailDB.length <1){
		cocktailList.push(new Cocktail("Margarita"));
		cocktailList[0].liquors.push('Tequila');
		cocktailList[0].liquors.push('Triple Sec');
		cocktailList[0].mixers.push('Lime Juice');
		cocktailList.push(new Cocktail("Whiskey Sour"));
		cocktailList[1].liquors.push('Whiskey');
		cocktailList[1].mixers.push('Lemon Juice'); 
		cocktailList[1].mixers.push('Simple Syrup');
		cocktailList.push(new Cocktail("Mojito")); 
		cocktailList[2].liquors.push('Rum');
		cocktailList[2].mixers.push('Mint Leaves');
		cocktailList[2].mixers.push('Simple Syrup');
		cocktailList[2].mixers.push('Lime Juice');
		cocktailList[2].mixers.push('Soda');
		cocktailList.push(new Cocktail('Long Island Iced Tea'));
		cocktailList[3].liquors.push('Vodka'); 
		cocktailList[3].liquors.push('Tequila');
		cocktailList[3].liquors.push('Rum');
		cocktailList[3].liquors.push('Gin');
		cocktailList[3].liquors.push('Triple Sec');
		cocktailList[3].mixers.push('Sweet and Sour Mix');
		cocktailList[3].mixers.push('Cola');
		cocktailList.push(new Cocktail("Rum & Coke"));
		cocktailList[4].liquors.push('Rum');
		cocktailList[4].mixers.push('Cola');
	}
	
	//Assign a color to each cocktail
	for(c = 0; c<cocktailList.length; c++){
		cocktailList[c].color = returnRGB(c,cocktailList.length, 1);
	}
}

//Draw the text for all the ingredients
function writeIngredientText(){
	var mIndexes = ingredientList.getIndexesOfType('Mixer');
	var lIndexes = ingredientList.getIndexesOfType('Liquor');	
    
    ctx.textAlign="left";
    ctx.textBaseline = "middle";
	
	var i;

	for(i = 0; i<lIndexes.length; i++){
		if(ingredientList.highlightState[lIndexes[i]] == 'normal'){
			ctx.fillStyle =  ingNormalFillStyle;
			ctx.font = ingNormalFont;
		}else if(ingredientList.highlightState[lIndexes[i]] == 'highlight'){
			ctx.fillStyle = ingHighlightFillStyle;
			ctx.font = ingHighlightFont;
		}else if(ingredientList.highlightState[lIndexes[i]] == 'nonhighlight'){
			ctx.fillStyle = ingNonHighlightFillStyle;
			ctx.font = ingNonHighlightFont;		
		}
		ctx.fillText(ingredientList.ingredients[lIndexes[i]],ingredientList.position[lIndexes[i]][0], ingredientList.position[lIndexes[i]][1]);
    }
    
	ctx.textAlign="right";
    //ctx.textBaseline = "middle";
    for(i = 0; i<mIndexes.length; i++){
 		if(ingredientList.highlightState[mIndexes[i]] == 'normal'){
			ctx.fillStyle =  ingNormalFillStyle;
			ctx.font = ingNormalFont;
		}else if(ingredientList.highlightState[mIndexes[i]] == 'highlight'){
			ctx.fillStyle = ingHighlightFillStyle;
			ctx.font = ingHighlightFont;
		}else{
			ctx.fillStyle = ingNonHighlightFillStyle;
			ctx.font = ingNonHighlightFont;		
		}
		ctx.fillText(ingredientList.ingredients[mIndexes[i]],ingredientList.position[mIndexes[i]][0], ingredientList.position[mIndexes[i]][1]);
    }
 }

function drawBoundingBox(box, color, trans){
	//alert(color.text + ' rgba('+color.r+','+color.g+','+color.b+','+trans+')');
	var cRad = Math.min((box[2]-box[0])/2,(box[3]-box[1])/2, 10);
	ctx.fillStyle = 'rgba('+color.r+','+color.g+','+color.b+','+trans+')';
	ctx.strokeStyle = 'rgba('+color.r+','+color.g+','+color.b+','+trans+')';
	ctx.beginPath();
	var midHeight = (box[3]-box[1])/2;
	ctx.moveTo(box[0], box[1]+midHeight);
	ctx.lineTo(box[0], box[1]+cRad);
	ctx.arc(box[0]+cRad,box[1]+cRad,cRad, Math.PI,1.5*Math.PI,false);
	ctx.lineTo(box[2]-cRad,box[1]);
	ctx.arc(box[2]-cRad,box[1]+cRad,cRad, 1.5*Math.PI,0*Math.PI,false);
	ctx.lineTo(box[2], box[3]-cRad);
	ctx.arc(box[2]-cRad,box[3]-cRad,cRad, 0*Math.PI,0.5*Math.PI,false);
	ctx.lineTo(box[0] + cRad, box[3]);
	ctx.arc(box[0]+cRad,box[3]-cRad,cRad, 0.5*Math.PI,1*Math.PI,false);
	ctx.closePath();
	ctx.fill();
	//ctx.fillRect(box[0], box[1], box[2]-box[0],box[3]-box[1]); 
}

function returnRGB(val, outOf, trans){
	if (typeof trans == "undefined")
		trans = 1;
	var numColors = 255*6;
	var r, g, b;
	r = g = b = 0;
	var color;
	
	var n = 6;	
	var rem = val%n;
	color = Math.round((val/n + outOf/n*rem)/outOf*numColors);
	
	if (color <255){
		r = color;
		b = 255;
	}else{
		if(color < 255*2){
			r = 255;
			b = 255*2-color;
		} else {
			if (color < 255*3){
				g = color-255*2;
				r = 255;
			}else{
				if(color < 255*4){
					g = 255;
					r = 255*4-color;
				}else{
					if(color < 255 *5){
						g = 255;
						b = color-255*4;
					}else{
						b=255;
						g = 255*6-color;
					}
				}
			}
		}
	}
	
	//var minBright = 255*2;
	//r = getRandomInt(0,255);
	//g = getRandomInt(minBright-255-r, 255);
	//b = minBright - r - g;
	
	return {r:r, g:g, b:b, text:'rgba('+r+','+g+','+b+',' + trans+')'};
}

function addAtoColor(c, a){
	return 'rgba('+c.r+','+c.g+','+c.b+','+ a+')';
}

/*  Draws a smooth S shaped curve between two points
    dir is either h or v
    curve factor is between 0(line) and 1(quadratic curve)

*/
function drawSCurve(sx, sy, fx, fy, dir, curveFactor){
    var mx = (fx+sx)/2;
    var my = (fy+sy)/2;
    var cx1, cy1, cx2, cy2, cx3, cy3, cx4, cy4;
    
    var dX = fx - sx;
    var dY = fy - sy;
    
    curveFactor = 0.3;
    
    var entryFactor = 0.4; 
    var lengthFactor = 0;
    
    var controlLength = Math.min(Math.abs(dX), Math.abs(dY))/2*lengthFactor;
    
    if (dir == 'h'){
        cx1 = sx+dX*entryFactor;
        cy1 = sy;
        
        var ddY, ddX;
        ddX = dX - 4*dX*entryFactor;
        controlLength = Math.min(Math.abs(dX), Math.abs(dY))/2*lengthFactor;
        
        var minAngle = Math.atan(dY/dX);
        var cAngle = curveFactor*(Math.PI/2 - minAngle) + minAngle;
        
        (sx-mx > 0) ? cx2 = mx + Math.cos(cAngle)*controlLength : cx2 = mx - Math.cos(cAngle)*controlLength;
        (sy-my > 0) ? cy2 = my + Math.sin(cAngle)*controlLength : cy2 = my - Math.sin(cAngle)*controlLength;
        
        (fx-mx > 0) ? cx3 = mx + Math.cos(cAngle)*controlLength : cx3 = mx - Math.cos(cAngle)*controlLength;
        (fy-my > 0) ? cy3 = my + Math.sin(cAngle)*controlLength : cy3 = my - Math.sin(cAngle)*controlLength;
        
        cx4 = fx - dX*entryFactor;
        cy4 = fy;
        
    }else{
        cx1 = sx;
        cy1 = sy + dY*entryFactor;
        var minAngle = Math.atan(dY/dX);
        var cAngle = curveFactor*(Math.PI/2 - minAngle) + minAngle;
        (sx-mx > 0) ? cx2 = mx + Math.cos(cAngle)*controlLength : cx2 = mx - Math.cos(cAngle)*controlLength;
        (sy-my > 0) ? cy2 = my + Math.sin(cAngle)*controlLength : cy2 = my - Math.sin(cAngle)*controlLength;
        
        (fx-mx > 0) ? cx3 = mx + Math.cos(cAngle)*controlLength : cx3 = mx - Math.cos(cAngle)*controlLength;
        (fy-my > 0) ? cy3 = my + Math.sin(cAngle)*controlLength : cy3 = my - Math.sin(cAngle)*controlLength;
        
        cx4 = fx;
        cy4 = fy - dY*entryFactor;            
        
        
    }
    
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.bezierCurveTo(cx1,cy1,cx2, cy2, mx,my);
    ctx.bezierCurveTo(cx3,cy3,cx4, cy4, fx,fy);  
    ctx.stroke();   
}

/**
 * Returns a random integer between min and max
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Sorts the array V
//Randomly swaps elements with the same value to minimize same answers
function sortWithIndex(values) {
	var v = new Array(values.length);
	var indexArray = new Array(values.length);
	var i;
	for (i=0; i<values.length; i++){
		v[i] = values[i];
		indexArray [i] = i;
	}
	var tempV, tempI;
	
	var sorting = true;
	while(sorting){
		sorting = false;
		for(i = 1; i<v.length; i++){
			if (v[i] > v[i-1] || (v[i] == v[i-1] && (Math.random()>0.5))){
				tempV = v[i];
				tempI = indexArray[i];
				v[i] = v[i-1];
				indexArray[i] = indexArray[i-1];
				v[i-1] = tempV;
				indexArray[i-1] = tempI;
				sorting = true;
			}
		}
	}
	return { value:v, index:indexArray};
}

var isEven = function(someNumber){
    return (someNumber%2 == 0) ? true : false;
};
