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

var title_image_height = 115;
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
var maxRecursiveDepth = 15;
var minPercentChange = 4;
var interactionMatrix = new D2Array(1,1);


/**********************************************
//Additional methods for the Array class
/*********************************************/
Array.prototype.sum = function(){
	
	var sum = 0;
	for(i=0; i<this.length; i++)
		sum = sum + this[i];
	
	return sum;
}

Array.prototype.absSum = function(){
	
	var sum = 0;
	for(i=0; i<this.length; i++)
		sum = sum + Math.abs(this[i]);
	return sum;
}

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


/***************************************************
//Class for storing 2 dimensional array
/***************************************************/
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

/*****************************************
//A class to store x & y positions
/*****************************************/
function Position(x, y){
	this._x = x;
	this._y = y;
}

Position.prototype.x = function(val){
	(val || val==0) ? this._x = val : 0;
	return this._x;
}

Position.prototype.y = function(val){
	(val || val==0) ? this._y = val : 0;
	return this._y;
}

Position.prototype.toString = function(){
	return "(" + this._x + ", " + this._y + ")";
	
}

/*************************************************
// A class to store a list of ingredients
// types is an array of types of ingredients that will be added
/*************************************************/
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
	return effSum;
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

IngredientList.prototype.setOrderByName = function(item, order){
    var i = this.getIndexByName(item);
    if (i!== null)
        this.order[i] = order;
};


IngredientList.prototype.getPositionByName = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.position[i];
};

IngredientList.prototype.getOrderByName = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.order[i];
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
        str = str+this.ingredients[i] + ' : ' + this.type[i] + ' : ' + this.normalSize[i] +' : ' + this.highlightSize[i] + '\n';
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


/********************************************************
//Class to store information about a cocktail
/*******************************************************/
function Cocktail(name){
    this.name = name;
    this.liquors = [];
	this.lAmount = [];
    this.mixers = [];
	this.mAmount = [];
    this.garnishes = [];
    this.glass = "";
	//this.color = "";
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

$(window).resize(function() {
  	sizeAndPositionMainElements();
	drawDrinkCanvas();
});

/*********************************************************
/Application functions
/********************************************************/
$(document).ready(function() {
	//function variables
	var i, j;
	
	var docHeight = $(window).height();
	var docWidth = $(window).width(); 
	
	//disable the ability to select text
	$("div").disableSelection();
	
	//load the cocktail database
	loadCocktailDB();
	
    //Generate list of ingredients
    $.each(cocktailList, function(index, c){
        ingredientList.addItems(c);
    });

	//Display ingredient list
	displayIngredients();	
	
	sizeAndPositionMainElements();
	
	//make the liquors-container sortable
	$('.liquors-container').sortable({
		revert:false,
		scroll:false,
		axis: "y",
		placeholder: "ui-state-highlight"
	});
	
	$('.mixers-container').sortable({
		revert:false,
		scroll:false,
		axis: "y",
		placeholder: "ui-state-highlight"
	});
	
	//make all divs with the menu-item class draggable
	$(".menu-item").draggable({ 
		revert: "invalid",	
		start: function(event, ui) {
			$(ui.draggable).css('position', 'relative');
			$(ui.draggable).css("z-index","3000");
		},
	});	
	
	//make all .menu-items change with hover
	$(".menu-item").hover(
	  function () {
		$(this).addClass("menu-item-hover");
	  }, 
	  function () {
		$(this).removeClass('menu-item-hover');
	  }
	);
	
	//click adds item to canvas
	$(".menu-item").click(function(){
		ingredientDropped(null, this);
	});
	
	//allow items to be dropped on the canvas
	$("#drink-canvas").droppable({
		drop: function (event, ui){ingredientDropped(event, ui.draggable);},
	});
	
	//program menu funtionality 
	$("#menu-hide").click(function(){
			$("#ing-menu-div").hide("slide", [], 'fast', function(){
				$("#ing-menu-show").show();
				setElementPositions(false);
				});
		});
	
	$("#ing-menu-show").click(function(){
		$("#ing-menu-show").hide();	
		$("#ing-menu-div").show("slide");
		setElementPositions(false);
	});	
		
	var cH, cW;
	cH = $('#drink-canvas').height();
	cW = $('#drink-canvas').width();
	
	//get the canvas and context from the html and store in global variables
	canvas = document.getElementById('drink-canvas');  
	ctx = canvas.getContext('2d');

	var color ={r:250, g:250, b:250};
	//drawBoundingBox([cW/2-250, cH/2-100, cW/2+250, cH/2+100], color, 0.9);
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.font="12px SWRomnd";
	ctx.fillText("Double click or drag ingredients down here. You might", cW/2, cH/2-20);
	ctx.fillText("need to draq quite a few to start forming cocktails.", cW/2, cH/2+20);
	
});

function sizeAndPositionMainElements(){
	var docHeight = $(window).height();
	var docWidth = $(window).width();
	
	//set width of ingredients menu
	$("#liquor-menu-span").css("left", 20 + 'px');
	$("#liquor-menu-span").css("width", (docWidth/2 - 40) + 'px');
	
	$("#mixer-menu-span").css("left", (docWidth/2+ 20) + 'px');
	$("#mixer-menu-span").css("width", (docWidth/2 - 40) + 'px');
	
	//calculate height of ingredients menu
	resizeIngredientMenu();

	//set the vertical position of the ingredient menu
	$("#ing-menu-div").css('top', (docHeight - $("#ing-menu-div").outerHeight()-5) + 'px');

	//set the size and position of selected liquor and mixer containers
	$(".ing-container").css("height", (docHeight - title_image_height - $("#ing-menu-div").outerHeight()) + 'px');
	$(".ing-container").css("top", title_image_height + 'px');
	
	
	$('#drink-canvas').css("top", title_image_height + "px");
	$('#drink-canvas').attr("height", $(".ing-container").outerHeight());
	$('#drink-canvas').attr("width",docWidth-20);
	
	$('.cocktail-container').css("top", title_image_height + "px");
	$('.cocktail-container').height($(".ing-container").outerHeight());
	$('.cocktail-container').css("left", $('.liquors-container').outerWidth() + 'px');
	$('.cocktail-container').css("right", $('.mixers-container').outerWidth() + 'px');
	
}

//calculate the actual x,y positions of all ingredients on the canvas
//this should be called any time the order of ingredients is changed
//but does NOT need to be called after insertNewIngredient()
function setIngredientPositions(){
	$('.liquor-ing').each(function(index) {
		var canHeight = $('#drink-canvas').height();
		var canOffset = $('#drink-canvas').offset();
		var numLiq = $('.liquor-ing').length;
		var posIndex = $(this).data("posIndex");
		$(this).offset({left:$(this).offset.left, top:canHeight/(numLiq+1)*(posIndex+1)+canOffset.top});
	});
	
	$('.mixer-ing').each(function(index) {
		var canHeight = $('#drink-canvas').height();
		var canOffset = $('#drink-canvas').offset();
		var numMix = $('.mixer-ing').length;
		var posIndex = $(this).data("posIndex");
		$(this).offset({left:$(this).offset.left, top:canHeight/(numMix+1)*(posIndex+1)+canOffset.top});
	});
}

//Should be called to add a new ingredient from the menu to the canvas
//Calculates the order number for the new ingredient, initializes data, and div position
function insertNewIngredient(item){
	var canHeight = $('#drink-canvas').height();
	var canWidth = $('#drink-canvas').width();
	var canOffset = $('#drink-canvas').offset();
	var classStr = ($(item).hasClass('liquor')) ? '.liquor-ing' : '.mixer-ing';
	var numIng = $(classStr).length;
	$(item).data("posIndex", numIng-1);
	$(item).data("matrixIndex", $('.liquor-ing, .mixer-ing').length-1);
	var ingWidth = $(item).outerWidth(true);
	($(item).hasClass('mixer')) ? $(item).offset({left:canOffset.left+canWidth - ingWidth, top:0}) : $(item).offset({left:canOffset.left, top:0});
	$(classStr).each(function(index) {
		var canHeight = $('#drink-canvas').height();
		var canOffset = $('#drink-canvas').offset();
		var classStr = ($(item).hasClass('liquor')) ? '.liquor-ing' : '.mixer-ing';
		var numIng = $(classStr).length;
		$(this).offset({left:$(this).offset.left, top:canHeight/(numIng+1)*($(this).data("posIndex")+1)+canOffset.top});
	});
	
	interactionMatrix.addColumn();
	interactionMatrix.addRow();
}

//function handler for any ingredient div being dropped on canvas
//possible scenarios are:
//	1. ingredient being dropped from menu onto canvas - need to then add ingredient to canvas
function ingredientDropped(event, item){
	//if it was a cocktail, do nothing
	if($(item).hasClass("cocktail"))
		return;
		
	var iType;
	var canPos = $("#drink-canvas").offset();
	var cocktailAdded = false;
	
	//Check if this is a newly dropped item from the menu
	if($(item).hasClass("menu-item")){		
		//remove style information
		$(item).attr("style", "");
		if($(item).hasClass("liquor")){
			iType = 'Liquor';
			$(item).attr("class", "liquor-ing liquor");
		}else{
			iType = 'Mixer';
			$(item).attr("class", "mixer-ing mixer");
		}

		$(item).insertBefore("#drink-canvas");		
		insertNewIngredient(item);
		$(item).unbind('mouseenter mouseleave click');
		ingredientList.addItem([$(item).html()], iType);

		$(item).hover(function () {
			$(this).addClass("ing-item-hover");
		  }, 
		  function () {
			$(this).removeClass('ing-item-hover');
		  }
		 );

		//I think i can get rid of this
		if($(item).hasClass("liquor")){
			$(item).draggable({ 
				//connectToSortable: ".liquors-container",
				helper: "original",
				revert: "invalid",	
				cursor: "pointer",
				start: function(event, ui) {
					$(item).css('position', 'relative');
					$(item).css("z-index","3000");
				},
			});
		}else{
			$(item).draggable({ 
				connectToSortable: ".mixers-container",
				helper: "original",
				revert: "invalid",	
				cursor: "pointer",
				start: function(event, ui) {
					$(item).css('position', 'relative');
					$(item).css("z-index","3000");
				},
			});
			
		}
		
		//since there is a new ingredient, check if we can make any new cocktails
		cocktailAdded = loadCocktails();
	}
	
/*	
	if(cocktailList.length>0){
		var color ={r:250, g:250, b:250};
		drawBoundingBox([cW/2-200, cH/2-100, cW/2+200, cH/2+100], color, 0.9);
		ctx.fillStyle = "black";
		ctx.textAlign = "center";
		ctx.fillText("Optimizing drink layout...\n This may take a minute.", cW/2, cH/2);
	}
*/	
	setTimeout(setElementPositions(cocktailAdded), 10);	
}

function displayIngredients(){
	var htmlStr = "<div class='menu-item-header'><h2>Liquors</h2></div>";
	for(i = 0; i < liquorDB.length; i++){
		htmlStr = htmlStr + "<div class='menu-item liquor ui-corner-all' id='"+liquorDB[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")+"'>"+liquorDB[i]+"</div>\n";
	}
	$("#liquor-menu-span").html(htmlStr);

	htmlStr = "<div class='menu-item-header'><h2>Mixers</h2></div>";
	for(i = 0; i < mixerDB.length; i++){
		htmlStr = htmlStr + "<div class='menu-item mixer ui-corner-all' id='"+mixerDB[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")+"'>"+mixerDB[i]+"</div>\n";
	}
	
	$("#mixer-menu-span").html(htmlStr);
	
}

function resizeIngredientMenu(){

	var menuL, menuM;
	
	$('#liquor-menu-span').height('auto');
	$('#mixer-menu-span').height('auto');
	$('#ing-menu-div').height('auto');
	
	menuH = $('#mixer-menu-span').height();
	menuL = $('#liquor-menu-span').height();
	if(menuH>menuL){
		$('#liquor-menu-span').height(menuH);
		$('#ing-menu-div').height(menuH);
	}else{
		$('#mixer-menu-span').height(menuL);
		$('#ing-menu-div').height(menuL);
	}
}

function setElementPositions(doOptimize){
	
	var docHeight = $(window).height();
	var docWidth = $(window).width();
	
	if(typeof(doOptimize)==='undefined'){
		doOptimize = true;
	}
	
	mouseOverReady = false;
	
	var cH, cW, i, j;
	
	sizeAndPositionMainElements();
	
	var mixers = $('mixer-ing').get();
	var liquors = $('liquor-ing').get();
	
	var mIndexes = new Array(mixers.length);
	var lIndexes = new Array(liquors.length);
	
	for (var i = 0; i<mixers.length; i++){
		mIndexes[$(mixers[i]).data("posIndex")] = $(mixers[i]).data("matrixIndex");
	}
	
	for (var i = 0; i<liquors.length; i++){
		lIndexes[$(liquors[i]).data("posIndex")] = $(liquors[i]).data("matrixIndex");
	}
	
	var oldEff = calculateEfficiency2(lIndexes, mIndexes, [1, 1]);
	var newEff = 0.5 * startEff;
	
	var maxTries = 100;
	var tries = 0;
	var minDiff = 0.9;
	if(optimize && doOptimize){
		while(tries < maxTries && newEff < oldEff * minDiff){
			var effOrder = optimizeIngredientOrder(lIndexes, mIndexes, oldEff;
			//return {order:iOrder, effNum: newEffNum, depth:rDepth};
		
		
		}
		for(var i=0; i<ingredients.length; i++)
			$(ingredients[i]).data("posIndex", effOrder.order[i]);
	}

	mouseOverReady = true;
	
	//Calculate actual x,y positions for ingredients
	setIngredientPositions();	
	//	ingredientList.setListPositions('Liquor',[5,5], [5,cH-5]);
	//	ingredientList.setListPositions('Mixer', [cW-5, cW-5], [5,cH-5]);
	optimizeCocktailPositions();
	
	drawDrinkCanvas();
}

function drawDrinkCanvas(){

	ctx.clearRect(0,0,canvas.width, canvas.height);

	var cH, cW;
	cH = canvas.height;	
	cW = canvas.width;	
	
	if(cocktailList.length<1){
		var color ={r:250, g:250, b:250};
		//drawBoundingBox([cW/2-250, cH/2-100, cW/2+250, cH/2+100], color, 0.9);
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.font="20px Arial";
		ctx.fillText("Keep adding ingredients!", cW/2, cH/2);
	}
	writeCocktailsAndPaths();	
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
				if(!liquorDB.includes(tempI.preferredingredient)){
					liquorDB.push(tempI.preferredingredient);
				}
			}
			if(tempI.ingredienttype=='Mixer'){
				cocktailDB[ci].mAmount.push(tempI.ingredientamount);	
				cocktailDB[ci].mixers.push(tempI.preferredingredient);
				if(!mixerDB.includes(tempI.preferredingredient))
					mixerDB.push(tempI.preferredingredient);
			}
			if(tempI.ingredienttype=='Garnish'){
				cocktailDB[ci].garnishes.push(tempI.preferredingredient);
				if(!liquorDB.includes(tempI.preferredingredient))
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
	
	//execute this code as filler when cocktail DB not available
	if(cocktailDB.length <1){
		cocktailDB.push(new Cocktail("Margarita"));
		cocktailDB[0].liquors.push('Tequila');
		liquorDB.push('Tequila');
		cocktailDB[0].liquors.push('Triple Sec');
		liquorDB.push('Triple Sec');
		cocktailDB[0].mixers.push('Lime Juice');
		mixerDB.push('Lime Juice');
		cocktailDB.push(new Cocktail("Whiskey Sour"));
		cocktailDB[1].liquors.push('Whiskey');
		liquorDB.push('Whiskey');
		cocktailDB[1].mixers.push('Lemon Juice'); 
		mixerDB.push('Lemon Juice');
		cocktailDB[1].mixers.push('Simple Syrup');
		mixerDB.push('Simple Syrup');
		cocktailDB.push(new Cocktail("Mojito")); 
		cocktailDB[2].liquors.push('Rum');
		liquorDB.push('Rum');
		cocktailDB[2].mixers.push('Mint Leaves');
		mixerDB.push('Mint Leaves');
		cocktailDB[2].mixers.push('Simple Syrup');
		cocktailDB[2].mixers.push('Lime Juice');
		cocktailDB[2].mixers.push('Soda');
		mixerDB.push('Soda');
		cocktailDB.push(new Cocktail('Long Island Iced Tea'));
		cocktailDB[3].liquors.push('Vodka'); 
		liquorDB.push('Vodka');
		cocktailDB[3].liquors.push('Tequila');
		cocktailDB[3].liquors.push('Rum');
		cocktailDB[3].liquors.push('Gin');
		liquorDB.push('Gin');
		cocktailDB[3].liquors.push('Triple Sec');
		cocktailDB[3].mixers.push('Sweet and Sour Mix');
		mixerDB.push('Sweet and Sour Mix');
		cocktailDB[3].mixers.push('Cola');
		mixerDB.push('Cola');
		cocktailDB.push(new Cocktail("Rum & Coke"));
		cocktailDB[4].liquors.push('Rum');
		cocktailDB[4].mixers.push('Cola');
	}
	
}

function writeCocktailsAndPaths(){
	//var canvas = document.getElementById('drink-canvas');  
	//var ctx = canvas.getContext('2d');
	
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
    var ingPos, alpha, tempFont, ctWidth;
	
	var selectedCocktails = [];
	var canPos = $("#drink-canvas").offset();
	
	
	ctx.lineWidth = ctNonHighlightLineWidth;
	$('.cocktail-nonhighlight').each(function(index) {
		var canPos = $("#drink-canvas").offset();
		var ctInfo = $(this).data("ctData");	//retrieve the cocktail info from the element
		var alpha = ctNonHighlightLineAlpha;
		var ctPos = $(this).offset();
		var ctWidth = $(this).innerWidth();
		var ctHeight = $(this).outerHeight(true);
		
		//draw lines to each liquor
		for(var i=0; i<ctInfo.liquors.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
				ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
				'h', curviness);
		}
		
		//draw lines to each mixer
		for(var i=0; i<ctInfo.mixers.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
						ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
						'h', curviness);
		}
	});
	
	
	//Draw all lines to 'normal' cocktails 
	ctx.lineWidth = ctNormalLineWidth;
	$('.cocktail-normal').each(function(index) {
		var canPos = $("#drink-canvas").offset();
		var ctInfo = $(this).data("ctData");	//retrieve the cocktail info from the element
		var alpha = ctNormalLineAlpha;
		var ctPos = $(this).offset();
		var ctWidth = $(this).innerWidth();
		var ctHeight = $(this).outerHeight(true);
		
		//draw lines to each liquor
		for(var i=0; i<ctInfo.liquors.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
				ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
				'h', curviness);
		}
		
		//draw lines to each mixer
		for(var i=0; i<ctInfo.mixers.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
						ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
						'h', curviness);
		}
	});
	
	
	//draw all lines to "highlighted" coctails
	ctx.lineWidth = ctHighlightLineWidth;
	$('.cocktail-highlight').each(function(index) {
		var canPos = $("#drink-canvas").offset();
		var ctInfo = $(this).data("ctData");	//retrieve the cocktail info from the element
		var alpha = ctHighlightLineAlpha;
		var ctPos = $(this).offset();
		var ctWidth = $(this).innerWidth();
		var ctHeight = $(this).outerHeight(true);
		
		for(var i=0; i<ctInfo.liquors.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
				ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
				'h', curviness);
		}
		
		for(var i=0; i<ctInfo.mixers.length; i++){
			ctx.strokeStyle = addAtoColor(ctInfo.color, alpha);
			var ingStr = "#" + ctInfo.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
						ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
						'h', curviness);
			}
	});

/*	
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
			
			var str = "#" + cocktailList[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			var ctPos = $(str).offset();
			var ctWidth = $(str).outerWidth(true);
			var ctHeight = $(str).outerHeight(true);
			
			for(i=0; i<cocktailList[c].liquors.length; i++){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, alpha);
				var ingStr = "#" + cocktailList[c].liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
				ingPos = $(ingStr).offset();
				var ingWidth = $(ingStr).outerWidth();
				var ingHeight = $(ingStr).outerHeight();
				drawSCurve(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
					ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
					'h', curviness);
			}  
					
			for(i=0; i<cocktailList[c].mixers.length; i++){
				ctx.strokeStyle = addAtoColor(cocktailList[c].color, alpha);
				ingPos = ingredientList.getBoundingBoxByName(cocktailList[c].mixers[i]);
				drawSCurve(ctPos.left+ctWidth, ctPos.top+ctHeight/2,
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
		var str = "#" + cocktailList[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
		var ctPos = $(str).position();
		var ctWidth = $(str).outerWidth(true);
		var ctHeight = $(str).outerHeight(true);
			
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
				ctPos.left, ctPos.top+ctHeight/2,
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
			drawSCurve(ctPos.left+ctWidth, ctPos.top+ctHeight/2,
				ingPos[0] - ingTextMargin, (ingPos[1]+ingPos[3])/2,
				'h', curviness);		
		}
	}
	*/
}

/**
* calculate the (arbitrary) efficiency number of this particular arrangement of ingredients
*/
function calcEfficiencyR(){
	var ing = (".liquor-ing, .mixer-ing").get();
	var ing = (".liquor-ing, .mixer-ing").get();
	var pos, type, mIndex, w;
	var effSum = 0;
	
	for (var i = 0; i< ing.length; i++){
		pos = $(ing[i]).data("posIndex");
		type = $(ing[i]).attr("class");
		mIndex = $(ing[i]).data("matrixIndex");
		for (var j = i+1; j < ing.length; i++){
			(type == $(ing[j]).attr("class")) ? w=weights[0] : w=weights[1];
			effSum = effSum + Math.pow(pos - $(ing[j]).data("posIndex"),2)*
				Math.pow(interactionMatrix.grab(mIndex,$(ing[j]).data("matrixIndex")),2)*w;
		}
	}
	return effSum;
}

/**
* calculate the value of an arbitrary function
* lArray - an array where each index represents the actual position on screen of the elemet and the value is the index of interactionMatrix
* w is a 2 element array with weights
*/
function calculateEfficiency2(lArray, mArray, w){
	var effSum = 0;
	for (var i = 0; i<lArray.length; i++){
		for(var j = i; j <lArray.length; j++){
			effSum = effSum +  Math.pow(i - j,2)*Math.pow(interactionMatrix.grab(lIndex[i],lIndex[j]),2)*w[0];
		}
		for(var j = 0; j <mArray.length; j++){
			effSum = effSum +  Math.pow(i - j,2)*Math.pow(interactionMatrix.grab(lIndex[i],mIndex[j]),2)*w[1];
		}
	}
	for (var i = 0; i < mArray.length; i++){
		for(var j = i; j <mArray.length; j++){
			effSum = effSum +  Math.pow(i - j,2)*Math.pow(interactionMatrix.grab(mIndex[i],mIndex[j]),2)*w[0];
		}
	}
	return effSum;
}

function optimizeIngredientOrder(lIndexes, mIndexes, oldEffNum, distance){
	var randomI;
	var tempValue;
	for(i = 0; i<lIndexes.length; i++){
		//get a random swappable index
		randomI = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - lIndexes.length+distance)), Math.max(Math.min(i+1,lIndexes.length), Math.min(lIndexes.length-1, i+lIndexes.length-distance)));
		tempValue = lIndexes[rIndex];
		lIndexes[rIndex] = lIndexes[i];
		lIndexes[i] = tempValue;
		newEffNum = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
		if((newEffNum < oldEffNum) || (newEffNum == oldEffNum && Math.random()>0.5)){
			oldEffNum = newEffNum;
		}else{
			tempValue = lIndexes[rIndex];
			lIndexes[rIndex] = lIndexes[i];
			lIndexes[i] = tempValue;
		}
	}	

	for(i = 0; i<mIndexes.length; i++){
		//get a random swappable index
		randomI = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - mIndexes.length+distance)), Math.max(Math.min(i+1,mIndexes.length), Math.min(mIndexes.length-1, i+mIndexes.length-distance)));
		tempValue = mIndexes[rIndex];
		mIndexes[rIndex] = mIndexes[i];
		mIndexes[i] = tempValue;
		newEffNum = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
		if((newEffNum < oldEffNum) || (newEffNum == oldEffNum && Math.random()>0.5)){
			oldEffNum = newEffNum;
		}else{
			tempValue = mIndexes[rIndex];
			mIndexes[rIndex] = mIndexes[i];
			mIndexes[i] = tempValue;
		}
	}
	return newEffNum;
}

/**
* Recursive function to optimize ingredient layout
*/
function optimizeIngredientOrderR(lIndexes, mIndexes, oldEffNum, rDepth){
	
	var initialEffNum = oldEffNum;
	var newEffNum;
	var tempO;
	var rIndex;
	var oOrder = iOrder.slice(0);
	
	//go through liquors trying random swaps
	for(i = 0; i<lIndexes.length; i++){
		rIndex = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - lIndexes.length+rDepth)), Math.max(Math.min(i+1,lIndexes.length), Math.min(lIndexes.length-1, i+lIndexes.length-rDepth)));
		var tempValue = lIndexes[
		
		tempO = iOrder[lIndexes[rIndex]];
		iOrder[lIndexes[rIndex]] = iOrder[lIndexes[i]];
		iOrder[lIndexes[i]] = tempO;
		newEffNum = calcEfficiencyR(iOrder, ingOptimizationWeights);
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
		newEffNum = calcEfficiencyR(iOrder, ingOptimizationWeights);
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
	
	return {order:oOrder, effNum:initialEffNum, depth:rDepth};
}

function optimizeCocktailPositions(){
	//Set cocktail positions
		
	var c, xPos, yPosL, yPosM;
	if (cocktailList.length == 0)
		return;
		
	var minX, maxX, xRank, xRange;
	minX = canvas.width/2-250;
	maxX = canvas.width/2+250;
				
	for(c=0; c<cocktailList.length; c++){
		cocktailList[c].position = [0,0];
		for(var cl = 0; cl<cocktailList[c].liquors.length; cl++){
			cocktailList[c].position[1] = cocktailList[c].position[1] + ingredientList.getPositionByName(cocktailList[c].liquors[cl])[1];
		}
		for(var cm = 0; cm<cocktailList[c].mixers.length; cm++){
			cocktailList[c].position[1] = cocktailList[c].position[1] + ingredientList.getPositionByName(cocktailList[c].mixers[cm])[1];
		}
		cocktailList[c].position[1] = cocktailList[c].position[1]/(cocktailList[c].liquors.length+cocktailList[c].mixers.length);
		cocktailList[c].position[0] = (minX*cocktailList[c].liquors.length + maxX*cocktailList[c].mixers.length)/
				(cocktailList[c].liquors.length+cocktailList[c].mixers.length);		
	}				
				
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
	minX = canvas.width/2-250;
	maxX = canvas.width/2+250;
	xRange = maxX-minX;
	xRank = new Array(cocktailList.length);
	
	for (c = 0; c<cocktailList.length; c++){
		xRank[c] = Math.pow(cocktailList[c].mixers.length,3) - Math.pow(cocktailList[c].liquors.length,3);
	}
	
	xRank = sortWithIndex(xRank);
	
	for (c = 0; c<cocktailList.length; c++){
		allX[xRank.index[c]] = (cocktailList.length-c-0.5)*xRange/cocktailList.length + minX;
	}
	
	var offset = $(canvas).offset();
	for (c = 0; c<cocktailList.length; c++){
		cocktailList[c].position = [Math.round(allX[c]), Math.round(allY[c])];
		
		cocktailList[c].updateBoundingBox();
		var str = "#" + cocktailList[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
		$(str).data("ctData", cocktailList[c]);
		var ctW = $(str).outerWidth();
		var ctH = $(str).outerHeight();
		$(str).offset({left:offset.left+$(str).data("ctData").position[0] - ctW/2, top:offset.top + $(str).data("ctData").position[1]-ctH/2});
		$(str).css("background-color", cocktailList[c].color.text);
	}
	
	
	
	//optimizeCtPositionsForce();
	
}

function optimizeCtPositionsForce(){
	if (cocktailList.length == 0)
		return;
	var minX, maxX, minY, maxY, c, i, j;
	minX = canvas.width/2-250;
	maxX = canvas.width/2+250;
	minY = 0;
	maxY =  canvas.height;
	
	var forces = new Array(cocktailList.length);
	for(i=0; i<forces.length; i++)
		forces[i] = {Fx:0, Fy:0};
	var oldForces = 100000000;
	var f, sumF;
	
	//calculate forces 
	for(i=0; i<cocktailList.length; i++){
		forces[i].Fx = calcForce(cocktailList[i].position, [minX, cocktailList[i].position[1]]).Fx 
			+ calcForce(cocktailList[i].position, [maxX, cocktailList[i].position[1]]).Fx; 
		forces[i].Fy = calcForce(cocktailList[i].position, [cocktailList[i].position[0], minY]).Fy 
			+ calcForce(cocktailList[i].position, [cocktailList[i].position[0], maxY]).Fy;
				
		for(j=0; j<cocktailList.length; j++){
			if(j!=i){
				f = calcForce(cocktailList[i].position, cocktailList[j].position);
				forces[i].Fx = forces[i].Fx + f.Fx;
				forces[i].Fy = forces[i].Fy + f.Fy; 				
			}
		}
	}
	
	sumF = 0;
	for(c=0; c<cocktailList.length; c++){
		sumF = sumF + Math.abs(forces[c].Fx) + Math.abs(forces[c].Fy);
		cocktailList[c].position = [cocktailList[c].position[0]+forces[c].Fx, cocktailList[c].position[1]+forces[c].Fy];
		cocktailList[c].position[0] = Math.max(cocktailList[c].position[0], minX);
		cocktailList[c].position[0] = Math.min(cocktailList[c].position[0], maxX);
		cocktailList[c].position[1] = Math.max(cocktailList[c].position[1], minY+1);
		cocktailList[c].position[1] = Math.min(cocktailList[c].position[1], maxY-1);
	}
	
	console.log("Initial F = " + sumF + ' < ' + oldForces);
	
	while(sumF < oldForces*0.99 && oldForces >1){
		console.log(sumF + ' < ' + oldForces);
		oldForces = sumF;
		for(i=0; i<cocktailList.length; i++){
			console.log("Force on " + cocktailList[i].name + " from left: " + calcForce(cocktailList[i].position, [minX, cocktailList[i].position[1]]).Fx);
			console.log("Force on " + cocktailList[i].name + " from right: " + calcForce(cocktailList[i].position, [maxX, cocktailList[i].position[1]]).Fx);
			console.log("Force on " + cocktailList[i].name + " from top: " + calcForce(cocktailList[i].position, [cocktailList[i].position[0], minY]).Fy);
			console.log("Force on " + cocktailList[i].name + " from bottom: " + calcForce(cocktailList[i].position, [cocktailList[i].position[0], maxY]).Fy);
			
			forces[i].Fx = calcForce(cocktailList[i].position, [minX, cocktailList[i].position[1]]).Fx 
				+ calcForce(cocktailList[i].position, [maxX, cocktailList[i].position[1]]).Fx; 
			forces[i].Fy = calcForce(cocktailList[i].position, [cocktailList[i].position[0], minY]).Fy 
				+ calcForce(cocktailList[i].position, [cocktailList[i].position[0], maxY]).Fy;
		
			for(j=0; j<cocktailList.length; j++){
				if(j!=i){
					f = calcForce(cocktailList[i].position, cocktailList[j].position);
					console.log("Force on " + cocktailList[i].name + " from " + cocktailList[j] + ": dX=" + f.Fx + " dY=" + f.Fy);
					forces[i].Fx = forces[i].Fx + f.Fx;
					forces[i].Fy = forces[i].Fy + f.Fy; 				
				}
			}
		}
		
		sumF = 0;
		for(c=0; c<cocktailList.length; c++){
			sumF = sumF + Math.abs(forces[c].Fx) + Math.abs(forces[c].Fy);
			console.log(cocktailList[c].name +  " " + forces[c].Fx + " " + forces[c].Fy);
			console.log(cocktailList[c].position);
			cocktailList[c].position = [cocktailList[c].position[0]+forces[c].Fx, cocktailList[c].position[1]+forces[c].Fy];
			console.log(cocktailList[c].position);
			cocktailList[c].position[0] = Math.max(cocktailList[c].position[0], minX);
			cocktailList[c].position[0] = Math.min(cocktailList[c].position[0], maxX);
			cocktailList[c].position[1] = Math.max(cocktailList[c].position[1], minY+1);
			cocktailList[c].position[1] = Math.min(cocktailList[c].position[1], maxY-1);
			console.log(cocktailList[c].position);
		}
	}	
	
	for (c = 0; c<cocktailList.length; c++){
		cocktailList[c].position = [Math.round(cocktailList[c].position[0]), Math.round(cocktailList[c].position[1])];
		cocktailList[c].updateBoundingBox();
	}
	
}

function loadCocktails(){
	var l, m, addC;
	var atLeastOneCTAdded = false;
	
	for(var c = 0; c<cocktailDB.length; c++){
		addC = true;

		//check if the cocktail is already in the cocktaillist
		for(var cl = 0; cl<cocktailList.length; cl++){
			if(cocktailList[cl].name == cocktailDB[c].name){
				addC = false;
				break;
			}
		}
		
		//check if we have all the liquors for the cocktail
		for(l=0; l<cocktailDB[c].liquors.length; l++){ 
			if($("#" + cocktailDB[c].liquors[l].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).hasClass("menu-item")){
				addC = false;
				break;
			}
		}
		
		//check if we have all the mixers for the cocktail
		for(m=0; m<cocktailDB[c].mixers.length; m++){ 
			if($("#" + cocktailDB[c].mixers[m].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).hasClass("menu-item")){
				addC = false;
				break;
			}
		}
		
		//We have everything we need for the cocktail, so let's add it it
		if(addC){
			atLeastOneCTAdded = true;
			cocktailList.push(cocktailDB[c]);
			//ingredientList.addItems(cocktailDB[c]);		
			//update the interactionMatrix
			addCocktailToMatrix(cocktailDB[c]);
			
			$("<div class='cocktail cocktail-normal ui-corner-all' id='"+cocktailDB[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")+"'>"+cocktailDB[c].name+"</div>").insertBefore('#cocktail-placeholder');
			var ctStr = "#" + cocktailDB[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
				
			$(ctStr).data("dbIndex", c);
			$(ctStr).data("x", 0);
			$(ctStr).data("y", 0);
			
			$(ctStr).mouseenter(function(){ctMouseEnter(this)});
			$(ctStr).mouseleave(function(){ctMouseExit(this)});					
			$(ctStr).click(function (){});
			
			$(ctStr).draggable({
					start: function() {
						
					},
					drag: function() {
						drawDrinkCanvas();
					},
					stop: function() {
						
						var ctD = $(this).data("ctData");
						var ctW = $(this).outerWidth();
						var ctH = $(this).outerHeight();
						ctD.position = [$(this).position().left+ctW/2, $(this).position().top+ctH/2]; 
						$(this).data("ctData", ctD);
						setTimeout(drawDrinkCanvas, 10);
					}
			});
			
		}
		
	}
	
	//Assign a color to each cocktail
	for(c = 0; c<cocktailList.length; c++){
		cocktailList[c].color = returnRGB(c,cocktailList.length, 1);
		var str = "#" + cocktailList[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
		$(str).css("background-color", cocktailList[c].color.text);
	}
	return atLeastOneCTAdded;
}

/**
* Update the interaction matrix based on adding a new cocktail
*/
function addCocktailToMatrix(c){
	var indexes = new Array();
	for(i=0; i<c.liquors.length; i++){
        indexes.push($("#" + c.liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).data("matrixIndex"));  
    }
	for(i=0; i<c.mixers.length; i++){
        indexes.push($("#" + c.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).data("matrixIndex"));
    }
	
	for(i=0; i<indexes.length; i++){
        interactionMatrix.put(indexes[i], indexes[i], interactionMatrix.grab(indexes[i], indexes[i])+1);        
        for(j=i+1; j<indexes.length; j++){
            interactionMatrix.put(indexes[i], indexes[j], interactionMatrix.grab(indexes[i], indexes[j])+1);
            interactionMatrix.put(indexes[j], indexes[i], interactionMatrix.grab(indexes[j], indexes[i])+1);
        }
    }
}

function ctMouseEnter(elem){
	$(elem).removeClass("cocktail-normal").addClass("cocktail-highlight");
	$(".cocktail-normal").removeClass("cocktail-normal").addClass("cocktail-nonhighlight");
	setTimeout(runOnEnterExit(elem), 10);
}

function ctMouseExit(elem){
	$(elem).removeClass("cocktail-highlight").addClass("cocktail-normal");
	$(".cocktail-nonhighlight").removeClass("cocktail-nonhighlight").addClass("cocktail-normal");
	setTimeout(runOnEnterExit(elem), 10);	
}

/**
* Function to be run every time the mouse enters or exits a cocktail div
* performs resizing so that the center of the div is constant
*/
function runOnEnterExit(elem){
	var canvasOffset = $(canvas).offset();
	var ctW = $(elem).outerWidth();
	var ctH = $(elem).outerHeight();
	var c;
	
	//re-position the element so that its center maintains fixed
	$(elem).offset({left:canvasOffset.left+$(elem).data("ctData").position[0] - ctW/2, top:canvasOffset.top + $(elem).data("ctData").position[1]-ctH/2});
	setTimeout(drawDrinkCanvas(), 10);
}

/**
* Given a value in a range, return a color
*/
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
	
	return {r:r, g:g, b:b, text:'rgb('+Math.round(r*trans)+','+Math.round(g*trans)+','+Math.round(b*trans)+')'};
}

/**
* Add an alpha channel to an RGB color
*/
function addAtoColor(c, a){
	return 'rgba(' + Math.round(c.r*a) +','+ Math.round(c.g*a) +','+ Math.round(c.b*a) +','+'1)';
}


/** 
* Draws a smooth S shaped curve between two points
* dir is either h or v
* curve factor is between 0(line) and 1(quadratic curve)
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

function calcForce(i,j){
	//if (i == j)
	//	return 0;
	
	var dX, dY, theta, F, Fx, Fy;
		
	dX = i[0] - j[0];
	dY = i[1] - j[1];
	theta = Math.abs(Math.atan(dY/dX));
	
	if(dX ==0 && dY == 0)
		return {Fx:0, Fy:0};
	
	F = 1/(dX*dX + dY*dY)*10000;	
		
	if(dX>0)	
		Fx = F*Math.cos(theta);
	else
		Fx = -1*F*Math.cos(theta);
		
	if(dY>0)
		Fy = F*Math.sin(theta);
	else
		Fy = -1*F*Math.sin(theta);
	
	if(isNaN(Fy))
		console.log("i: " + i + " j: " + j + " dX: " + dX + " dY: " + dY +  " Theta: " + theta + " Fx: " + Fx + " Fy: " + Fy);	
	
	return {Fx:Fx, Fy:Fy};
}

var isEven = function(someNumber){
    return (someNumber%2 == 0) ? true : false;
};
