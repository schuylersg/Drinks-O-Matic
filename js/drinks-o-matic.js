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

var ctNormalLineAlpha = 0.4;
var ctHighlightLineAlpha = 1;
var ctNonHighlightLineAlpha = 0.2;

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
var masterGlassList = [];
var cocktailBeingDragged = null;
var draggedCocktail = null;
var ingredientSelected = null;
var canvas;
var ingOptimizationWeights = [1, 1];
var cocktailSelected = null;
var optimize = true;
var maxRecursiveDepth = 15;
var minPercentChange = 4;
var interactionMatrix = new D2Array(1,0.5);

var cocktailOptimizeFlag = false;
var ingredientOptimizeFlag = false;

var busy = false;

var palette = [[195, 6, 6],
[177, 38, 51],
[135, 43, 52],
[237, 4, 26],
[114, 7, 75],
[175, 85, 142],
[135, 10, 146],
[151, 4, 164],
[94, 4, 164],
[96, 59, 125],
[81, 76, 158],
[15, 6, 133],
[24, 18, 104],
[75, 150, 163],
[32, 175, 201],
[18, 96, 110],
[26, 121, 97],
[66, 177, 150],
[26, 244, 190],
[58, 193, 109],
[68, 137, 94],
[127, 195, 138],
[58, 152, 46],
[48, 145, 35],
[176, 245, 94],
[213, 238, 74],
[227, 242, 55],
[233, 225, 16],
[251, 245, 73],
[252, 182, 38],
[242, 139, 38],
[246, 114, 16],
[246, 65, 16],
[229, 75, 33]];

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

D2Array.prototype.numColumns = function (){
	return this.columns;
}

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
}

Cocktail.prototype.toString = function(){
	var str = "<h3>" + this.name + '</h3>';
	for (var l = 0; l < this.liquors.length; l++){
		str = str + this.liquors[l] + '\t' + this.lAmount[l] + '<br />';
	}
	for (var m = 0; m < this.mixers.length; m++){
		str = str + this.mixers[m] + '\t' + this.mAmount[m] + '<br />';
	}
	for (var g = 0; g < this.garnishes.length; g++){
		str = str + this.garnishes[g] + '<br />';
	}
	
	str = str + "Glass: " + this.glass;
	
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
    for(m = 0; m<this.mixers.length; m++){
        if (this.mixers[m] == mixerName)
            return true;
    }
    return false;
};

Cocktail.prototype.hasIngredient = function(iName){
	return (this.hasLiquor(iName) || this.hasMixer(iName) );
}

/*********************************************************
/Application functions
/********************************************************/

$(window).resize(function() {
	busy = true;
	ingredientOptimizeFlag = true;
  	setTimeout(setElementPositions,10);
});

$(document).ready(function() {
	//function variables
	var i, j;
	var docHeight = $(window).height();
	var docWidth = $(window).width(); 
	
	//disable the ability to select text
	$("div").disableSelection();
	
	$("#recipe-close").click(function(){$("#cocktail-recipe").removeClass("recipe-show").addClass("recipe-hide")});
	
	//load the cocktail database
	loadCocktailDB();

	//Display ingredient list
	displayIngredients();	
	
	sizeAndPositionMainElements();
	
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
	
	/*
	$(".ingredient").on("click", function (event) {
		$(this).toggleClass("ingredient-hover");
	  }
	);
	
	*/
	
	//click adds item to canvas
	$(".menu-item").click(function(){
		ingredientDropped(null, this);
	});
	
	//allow items to be dropped on the canvas
	$("#drink-canvas").droppable({
		drop: function (event, ui){ingredientDropped(event, ui.draggable);},
	});
	
	//program menu funtionality - NEED TO IMPLEMENT
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
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.font="12px SWRomnd";
	ctx.fillText("Double click or drag ingredients down here. You might", cW/2, cH/2-20);
	ctx.fillText("need to draq quite a few to start forming cocktails.", cW/2, cH/2+20);
	
});

//function handler for any ingredient div being dropped on canvas
//possible scenarios are:
//	1. ingredient being dropped from menu onto canvas - need to then add ingredient to canvas
function ingredientDropped(event, item){
	//if it was a cocktail, do nothing
	if($(item).hasClass("cocktail") || busy)
		return;
		
	var iType;
	var canPos = $("#drink-canvas").offset();
	var cocktailsAdded;
	
	//Check if this is a newly dropped item from the menu
	if($(item).hasClass("menu-item")){		
		busy = true;
		//remove style information
		$(item).off();
		var itemID = "#" + $(item).text().replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
		$(item).removeClass('menu-item ui-corner-all');		
		$(item).attr("style", "");
		$(item).addClass('ingredient');

		if($(item).hasClass("liquor")){
			iType = 'Liquor';
			$(item).attr("class", "liquor-ing liquor");
		}else{
			iType = 'Mixer';
			$(item).attr("class", "mixer-ing mixer");
		}

		$(item).insertBefore("#drink-canvas");

		$(item).draggable('destroy');
		$(itemID).mouseenter(function(){ ingredientHighlighted($(this))});
		$(itemID).mouseleave(function(){ ingredientUnighlighted($(this))});	
			
			
		interactionMatrix.addColumn();
		interactionMatrix.addRow();
		$(item).data("matrixIndex", interactionMatrix.numColumns()-1);
		
		//see if any cocktails should be added
		cocktailsAdded = loadCocktails();
		//insert the div of the new ingredient into the document
		insertNewIngredient(item);		
		setIngredientPositions();
		
		//find the optimum position for the ingredient 
		if(cocktailsAdded.length > 0){
			moveNewIngredientToOptimum(item);
			positionNewCocktails(cocktailsAdded);
			//cocktailOptimizeFlag = true;
		}		
		ingredientOptimizeFlag = true;
		//$(item).unbind('mouseenter mouseleave click');
	}	
	setTimeout(setElementPositions, 1);	//use setTimeout because we never want to return here
											//program should just autonomously run until optimums are found
	//setElementPositions(true);
}

function ingredientHighlighted(item){
	$('.ingredient').removeClass('ingredient').addClass('ingredient-nonhighlight');
	$(item).removeClass('ingredient-nonhighlight').addClass('ingredient-highlight');
	var cocktails = $('.cocktail').get();
	for (var c = 0; c < cocktails.length; c++){
		if(cocktailDB[$(cocktails[c]).data("dbIndex")].hasIngredient($(item).text())){
			$(cocktails[c]).removeClass("cocktail-normal").addClass("cocktail-highlight");
		}else{
			$(cocktails[c]).removeClass("cocktail-normal").addClass("cocktail-nonhighlight");
		}
	}
	setIngredientPositions();
	drawDrinkCanvas();
}

function ingredientUnighlighted(item){
	$(item).removeClass('ingredient-highlight').addClass('ingredient')
	$('.ingredient-nonhighlight').removeClass('ingredient-nonhighlight').addClass('ingredient');
	$('.cocktail').removeClass('cocktail-highlight cocktail-nonhighlight').addClass('cocktail-normal');
	setIngredientPositions();
	drawDrinkCanvas();
}

function loadCocktails(){
	var l, m, addC;
	var cocktailsAdded = new Array();
	var cocktails = $('.cocktail').get();
	
	for(var c = 0; c<cocktailDB.length; c++){
		addC = true;

		//check if the cocktail is already in the cocktaillist
		for(var cl = 0; cl<cocktails.length; cl++){
			if($(cocktails[cl]).text() == cocktailDB[c].name){
				addC = false;
				break;
			}
		}
		
		if(addC){
			//check if we have all the liquors for the cocktail
			for(l=0; l<cocktailDB[c].liquors.length; l++){ 
				if($("#" + cocktailDB[c].liquors[l].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).hasClass("menu-item")){
					addC = false;
					break;
				}
			}
		}
		
		if(addC){
			//check if we have all the mixers for the cocktail
			for(m=0; m<cocktailDB[c].mixers.length; m++){ 
				if($("#" + cocktailDB[c].mixers[m].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).hasClass("menu-item")){
					addC = false;
					break;
				}
			}
		}
		
		//We have everything we need for the cocktail, so let's add it it
		if(addC){
			cocktailsAdded.push(cocktailDB[c]);
			
			//update the interactionMatrix
			addCocktailToMatrix(cocktailDB[c]);
			
			$("<div class='cocktail cocktail-normal ui-corner-all' id='"+cocktailDB[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")+"'>"+cocktailDB[c].name+"</div>")
							.insertBefore('#drink-canvas');
			var ctStr = "#" + cocktailDB[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
				
			$(ctStr).data("dbIndex", c);
			$(ctStr).data("verticalPos", $('.cocktail').length);
						
			$(ctStr).mouseenter(function(){ctMouseEnter(this)});
			$(ctStr).mouseleave(function(){ctMouseExit(this)});					
			$(ctStr).click(function (){cocktailClicked(this)});
			var col = returnRGB(c,cocktails.length, 1);
			$(ctStr).css("background-color", col.text);
			$(ctStr).css("color", invertColor(col).text);
			
			$(ctStr).draggable({
					start: function() {
						
					},
					drag: function() {
						//optimizeCtPositionsForce();
						//cocktailOptimizeFlag = true;
						drawDrinkCanvas();
					},
					stop: function() {
						setTimeout(drawDrinkCanvas, 1);
					}
			});	
		}
		
	}

	
	//reget list of cocktails since some may have been added
	cocktails = $('.cocktail').get();
	
	//Assign a color to each cocktail
	for(c = 0; c<cocktails.length; c++){
		var col = returnRGB(c,cocktails.length, 1);
		$(cocktails[c]).css("background-color", col.text);
		$(cocktails[c]).css("color", invertColor(col).text);

	}
	
	return cocktailsAdded;
}

function cocktailClicked(ct){
	$('#cocktail-recipe').html(cocktailDB[$(ct).data("dbIndex")].toString()+$('#cocktail-recipe').html());
	var os = $(ct).offset();
	$('#cocktail-recipe').removeClass("recipe-hide").addClass("recipe-show");
	$('#cocktail-recipe').offset({left:os.left + $(ct).width()/2 - $('#cocktail-recipe').outerWidth()/2, top:os.top + $(ct).outerHeight() + 3});

}

//try putting new ingredient in all positions to see what optimum is
function moveNewIngredientToOptimum(item){
	
	var mixers = $('.mixer-ing').get();
	var liquors = $('.liquor-ing').get();
			
	var mIndexes = new Array(mixers.length);
	var lIndexes = new Array(liquors.length);
	
	for (var i = 0; i<mixers.length; i++){
		mIndexes[$(mixers[i]).data("posIndex")] = $(mixers[i]).data("matrixIndex");
	}
	
	for (var i = 0; i<liquors.length; i++){
		lIndexes[$(liquors[i]).data("posIndex")] = $(liquors[i]).data("matrixIndex");
	}
	
	var mySwappableIndexes = ($(item).hasClass('liquor')) ? lIndexes : mIndexes;
	var temp;
	var bestEfficiency = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
	var bestPosition = $(item).data("posIndex");
	var tempEff;
	
	for(var i = mySwappableIndexes.length-2; i > -1; i--){
		temp = mySwappableIndexes[i];
		mySwappableIndexes[i] = mySwappableIndexes[i+1];
		mySwappableIndexes[i+1] = temp;
		tempEff = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
		if (tempEff < bestEfficiency){
			bestEfficiency = tempEff;
			bestPosition = i;
		}
	}
	
	for(var i = 0; i<bestPosition; i++){
		temp = mySwappableIndexes[i];
		mySwappableIndexes[i] = mySwappableIndexes[i+1];
		mySwappableIndexes[i+1] = temp;
	}
	
	//update new positions
	for (var i = 0; i<mixers.length; i++){
		for (var j = 0; j < mIndexes.length; j ++) {				
			if($(mixers[i]).data("matrixIndex") == mIndexes[j]){
				$(mixers[i]).data("posIndex", j);
				break;
			}
		}
	}

	for (var i = 0; i<liquors.length; i++){
		for (var j = 0; j < lIndexes.length; j ++) {				
			if($(liquors[i]).data("matrixIndex") == lIndexes[j]){
				$(liquors[i]).data("posIndex", j);
				break;
			}
		}
	}
		
	//update new positions
	setIngredientPositions();
}

function positionNewCocktails(cocktailsAdded){
	var left, top;
	var offset;
	for(var c = 0; c<cocktailsAdded.length; c++){
		left = 0;
		top = 0;
		for(l=0; l<cocktailsAdded[c].liquors.length; l++){ 
			offset = $("#" + cocktailsAdded[c].liquors[l].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).offset();
			left = left + offset.left;
			top = top + offset.top;
		}
			
		for(m =0; m<cocktailsAdded[c].mixers.length; m++){ 
			offset = $("#" + cocktailsAdded[c].mixers[m].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_")).offset();
			left = left + offset.left;
			top = top + offset.top;
		}
		var ctStr = "#" + cocktailsAdded[c].name.replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
		$(ctStr).offset({left:$('#drink-canvas').width()/2, top:top/(cocktailsAdded[c].liquors.length + cocktailsAdded[c].mixers.length)});
	}
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
	var ingWidth = $(item).outerWidth(true);
	($(item).hasClass('mixer')) ? $(item).offset({left:canOffset.left+canWidth - ingWidth, top:0}) : $(item).offset({left:canOffset.left, top:0});
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
	
	var cH, cW, i, j;
	
	sizeAndPositionMainElements();
	
	var mixers = $('.mixer-ing').get();
	var liquors = $('.liquor-ing').get();
		
	var mIndexes = new Array(mixers.length);
	var lIndexes = new Array(liquors.length);
	
	for (var i = 0; i<mixers.length; i++){
		mIndexes[$(mixers[i]).data("posIndex")] = $(mixers[i]).data("matrixIndex");
	}
	
	for (var i = 0; i<liquors.length; i++){
		lIndexes[$(liquors[i]).data("posIndex")] = $(liquors[i]).data("matrixIndex");
	}
	
	var newEff = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
	
	if(optimize){
		//probably should disable the ability to add any more ingredients
		setTimeout(function(){startOptimization(0, lIndexes, mIndexes, Infinity, Infinity, 0)},1);	//never return here
	}
}

function startOptimization(iteration, lIndexes, mIndexes, oldEff, oldForce, currentTriesAtScore){
	
	var maxTries = 100;
	var maxNoChange = 5;
	var minDiff = 0.999;
	var newEff;
	iteration=iteration + 1;
	if(iteration>maxTries || currentTriesAtScore > 10){
		ingredientOptimizeFlag = false;
		cocktailOptimizeFlag = false;
		var cocktails = $('.cocktail').get();
		var ctAdded = new Array();
		for (var c = 0; c < cocktails.length; c++){
			ctAdded[c] = cocktailDB[$(cocktails[c]).data("dbIndex")];
		}
		setIngredientPositions();
		console.log("Positioning cocktails:", iteration);
		positionNewCocktails(ctAdded);
		scaleElementsVertically();
		drawDrinkCanvas();
		ingredientOptimizeFlag = false;
		busy = false;
	}
	
	if(ingredientOptimizeFlag){
		newEff = optimizeIngredientOrder(iteration, lIndexes, mIndexes, oldEff, (maxTries - iteration)/maxTries);
		if(newEff <= oldEff){
			if(newEff >= oldEff)
				currentTriesAtScore++;
			else
				currentTriesAtScore = 0;
			oldEff = newEff;
			//update new positions
			var mixers = $('.mixer-ing').get();
			var liquors = $('.liquor-ing').get();
			
			for (var i = 0; i<mixers.length; i++){
				for (var j = 0; j < mIndexes.length; j ++) {				
					if($(mixers[i]).data("matrixIndex") == mIndexes[j]){
						$(mixers[i]).data("posIndex", j);
						break;
					}
				}
			}

			for (var i = 0; i<liquors.length; i++){
				for (var j = 0; j < lIndexes.length; j ++) {				
					if($(liquors[i]).data("matrixIndex") == lIndexes[j]){
						$(liquors[i]).data("posIndex", j);
						break;
					}
				}
			}
			//setIngredientPositions();
		}else{
			//ingredientOptimizeFlag = false;
		}
	}
	
	//do i need this?
	if(ingredientOptimizeFlag){// || cocktailOptimizeFlag){
		setTimeout(function(){startOptimization(iteration, lIndexes, mIndexes, oldEff, 0, currentTriesAtScore)}, 1);
	}
	return;
}	

function optimizeIngredientOrder(iteration, lIndexes, mIndexes, oldEffNum, distancePercent){
	var randomI;
	var tempValue;
	var newEffNum;
	
	var distance = Math.ceil(lIndexes.length*distancePercent);
	for(i = 0; i<lIndexes.length; i++){
		//get a random swappable index
		randomI = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - lIndexes.length+distance)), 
								Math.max(Math.min(i+1,lIndexes.length-1), Math.min(lIndexes.length-1, i+lIndexes.length-distance)));
		if(interactionMatrix.grab(lIndexes[i], lIndexes[i])>0 || interactionMatrix.grab(lIndexes[randomI], lIndexes[randomI])>0){ 		
			tempValue = lIndexes[randomI];
			lIndexes[randomI] = lIndexes[i];
			lIndexes[i] = tempValue;
			newEffNum = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
			if((newEffNum < oldEffNum) || (newEffNum == oldEffNum && Math.random()>0.5)){
				oldEffNum = newEffNum;
			}else{
				tempValue = lIndexes[randomI];
				lIndexes[randomI] = lIndexes[i];
				lIndexes[i] = tempValue;
			}
		}	
	}

	distance = Math.round(mIndexes.length*distancePercent);
	for(i = 0; i<mIndexes.length; i++){
		//get a random swappable index
		randomI = getRandomInt(Math.min(Math.max(0,i-1), Math.max(0, i - mIndexes.length+distance)), 
								Math.max(Math.min(i+1,mIndexes.length-1), Math.min(mIndexes.length-1, i+mIndexes.length-distance)));
		if(interactionMatrix.grab(mIndexes[i], mIndexes[i])>0 || interactionMatrix.grab(mIndexes[randomI], mIndexes[randomI])>0){
			tempValue = mIndexes[randomI];
			mIndexes[randomI] = mIndexes[i];
			mIndexes[i] = tempValue;
			newEffNum = calculateEfficiency2(lIndexes, mIndexes, ingOptimizationWeights);
			if((newEffNum < oldEffNum) || (newEffNum == oldEffNum && Math.random()>0.5)){
				oldEffNum = newEffNum;
			}else{
				tempValue = mIndexes[randomI];
				mIndexes[randomI] = mIndexes[i];
				mIndexes[i] = tempValue;
			}
		}
	}
	return oldEffNum;
}

function drawDrinkCanvas(){

	ctx.clearRect(0,0,canvas.width, canvas.height);

	var cH, cW;
	cH = canvas.height;	
	cW = canvas.width;	
	
	if($('.cocktail').length<1){
		var color ={r:250, g:250, b:250};
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.font="20px SWRomnd";
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
		var ctInfo = cocktailDB[$(this).data("dbIndex")];	//retrieve the cocktail info from the element
		var alpha = ctNonHighlightLineAlpha;
		var ctPos = $(this).offset();
		var ctWidth = $(this).innerWidth();
		var ctHeight = $(this).outerHeight(false);
		
		//draw lines to each liquor
		for(var i=0; i<ctInfo.liquors.length; i++){
			ctx.strokeStyle = addAtoColor($(this).css("background-color"), alpha);
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
			ctx.strokeStyle = addAtoColor($(this).css("background-color"), alpha);
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
		var ctInfo = cocktailDB[$(this).data("dbIndex")];	//retrieve the cocktail info from the element
		var alpha = ctNormalLineAlpha;
		var ctPos = $(this).offset();
		var ctWidth = $(this).innerWidth();
		var ctHeight = $(this).outerHeight(false);
		
		//draw lines to each liquor
		for(var i=0; i<ctInfo.liquors.length; i++){
			ctx.strokeStyle = addAtoColor($(this).css("background-color"), ctNormalLineAlpha);
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
			ctx.strokeStyle = addAtoColor($(this).css("background-color"), ctNormalLineAlpha);
			var ingStr = "#" + ctInfo.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			ingPos = $(ingStr).offset();
			var ingWidth = $(ingStr).outerWidth();
			var ingHeight = $(ingStr).outerHeight();
			drawSCurve(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
						ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
						'h', curviness);
		}
	});
	
	var linesToDrawOnTop = new Array();
	var strokeStyles = new Array();
	
	//draw all lines to "highlighted" coctails
	ctx.lineWidth = ctHighlightLineWidth;
	var hlCt = $('.cocktail-highlight').get();
	var canPos = $("#drink-canvas").offset();
	for(var c = 0; c < hlCt.length; c++) {
		var ctInfo = cocktailDB[$(hlCt[c]).data("dbIndex")];	//retrieve the cocktail info from the element
		var alpha = ctHighlightLineAlpha;
		var ctPos = $(hlCt[c]).offset();
		var ctWidth = $(hlCt[c]).innerWidth();
		var ctHeight = $(hlCt[c]).outerHeight(false);
		
		for(var i=0; i<ctInfo.liquors.length; i++){
			var ingStr = "#" + ctInfo.liquors[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			if($(ingStr).hasClass('ingredient-nonhighlight')){
				ctx.strokeStyle = addAtoColor($(hlCt[c]).css("background-color"), ctNonHighlightLineAlpha);
				ctx.lineWidth = ctNonHighlightLineWidth;
				ingPos = $(ingStr).offset();
				var ingWidth = $(ingStr).outerWidth();
				var ingHeight = $(ingStr).outerHeight();
				drawSCurve(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
					ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
					'h', curviness);
			}else{
				strokeStyles.push($(hlCt[c]).css("background-color"));
				ingPos = $(ingStr).offset();
				var ingWidth = $(ingStr).outerWidth();
				var ingHeight = $(ingStr).outerHeight();
				linesToDrawOnTop.push(new Array(ingPos.left + ingWidth + ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
					ctPos.left - canPos.left, ctPos.top+ctHeight/2 - canPos.top));
			}
		}
		
		for(var i=0; i<ctInfo.mixers.length; i++){
			var ingStr = "#" + ctInfo.mixers[i].replace(/ /gi, "_").replace(/'/gi, "_").replace(/\./gi, "_");
			if($(ingStr).hasClass('ingredient-nonhighlight')){
				ctx.strokeStyle = addAtoColor($(hlCt[c]).css("background-color"), ctNonHighlightLineAlpha);
				ctx.lineWidth = ctNonHighlightLineWidth;
				ingPos = $(ingStr).offset();
				var ingWidth = $(ingStr).outerWidth();
				var ingHeight = $(ingStr).outerHeight();
				drawSCurve(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
							ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top, 
							'h', curviness);
			}else{
				strokeStyles.push($(hlCt[c]).css("background-color"));
				ingPos = $(ingStr).offset();
				var ingWidth = $(ingStr).outerWidth();
				var ingHeight = $(ingStr).outerHeight();
				linesToDrawOnTop.push(new Array(ctPos.left + ctWidth - canPos.left, ctPos.top+ctHeight/2 - canPos.top,
					ingPos.left - ingTextMargin - canPos.left, ingPos.top + ingHeight/2 - canPos.top));
			}			
		}
	}
	var j;
	ctx.lineWidth = ctHighlightLineWidth;
	console.log(strokeStyles);
	console.log(linesToDrawOnTop);
	for(var s = 0; s < strokeStyles.length; s++){
		ctx.strokeStyle = strokeStyles[s];
		j = linesToDrawOnTop[s];
		console.log(j);
		drawSCurve(j[0], j[1], j[2], j[3], 'h', curviness);
	}
}

function ctCompareTop(a, b){
	return $(a).offset().top - $(b).offset().top
}

function scaleElementsVertically(){
	var cocktails = $('.cocktail').get();
	var height = $('#drink-canvas').height();
	var canvasTop = $('#drink-canvas').offset().top;
	var canvasCenter = $('#drink-canvas').offset().left + $('#drink-canvas').width()/2;
	var sorting = true;
	var temp;
	var smallest;
	var index;
	var last = 0;

	//sort the cocktails by their offset.top
	cocktails.sort(ctCompareTop);
		
	for(var c = 0; c < cocktails.length; c++){
		$(cocktails[c]).data("verticalPos", c);
		console.log($(cocktails[c]).text(), $(cocktails[c]).data("verticalPos"));
		$(cocktails[c]).offset({left:canvasCenter - $(cocktails[c]).width()/2, top:canvasTop + height/(cocktails.length+1)*($(cocktails[c]).data("verticalPos")+1)});
		//console.log($(cocktails[c]).text(), $(cocktails[c]).data("verticalPos"));
	}
	
	var overlap;
	var sideSum;
	var randomSide = [-1, 1];
	var sorting = true;
	var iterations = 0;
	//cocktails are still sorted by vertical position
	while(sorting && iterations<10){
		sorting=false;
		iterations = iterations + 1;
		for(var c = 0; c < cocktails.length-1; c++){
			for(var d = c+1; d < cocktails.length; d++){	
				if(checkForOverlap(cocktails[c], cocktails[d], 2, ($(cocktails[c]).outerWidth() + $(cocktails[d]).outerWidth())*0.2)){
					sorting=true;
					sideSum = cocktailDB[$(cocktails[d]).data("dbIndex")].mixers.length - cocktailDB[$(cocktails[c]).data("dbIndex")].mixers.length 
							- cocktailDB[$(cocktails[d]).data("dbIndex")].liquors.length + cocktailDB[$(cocktails[c]).data("dbIndex")].liquors.length;
					(sideSum == 0) ? sideSum = randomSide[getRandomInt(0,1)]: 0;
					if(sideSum < 0){ //bottom is to the left
						overlap = $(cocktails[d]).offset().left + $(cocktails[d]).outerWidth() - $(cocktails[c]).offset().left + 
							($(cocktails[c]).outerWidth() + $(cocktails[d]).outerWidth())*0.2;
						$(cocktails[d]).offset({left:$(cocktails[d]).offset().left - overlap/2, top:$(cocktails[d]).offset().top});
						$(cocktails[c]).offset({left:$(cocktails[c]).offset().left + overlap/2, top:$(cocktails[c]).offset().top});
					}else{
						overlap = $(cocktails[c]).offset().left + $(cocktails[c]).outerWidth() - $(cocktails[d]).offset().left + 
							($(cocktails[c]).outerWidth() + $(cocktails[d]).outerWidth())*0.2; 
						$(cocktails[d]).offset({left:$(cocktails[d]).offset().left + overlap/2, top:$(cocktails[d]).offset().top});
						$(cocktails[c]).offset({left:$(cocktails[c]).offset().left - overlap/2, top:$(cocktails[c]).offset().top});						
					}
				}
			}
		}
	}
}
/**calculate the actual x,y positions of all ingredients on the canvas
* based on their data - order
* this should be called any time the order of ingredients is changed
*but does NOT need to be called after insertNewIngredient()
*/
function setIngredientPositions(){
	$('.liquor-ing').each(function(index) {
		var canHeight = $('#drink-canvas').height();
		var canOffset = $('#drink-canvas').offset();
		var numLiq = $('.liquor-ing').length;
		var posIndex = $(this).data("posIndex");
		var h = $(this).height();
		$(this).offset({left:$(this).offset().left, top:canHeight/(numLiq+1)*(posIndex+1)-h/2+canOffset.top});
	});
	
	$('.mixer-ing').each(function(index) {
		var canHeight = $('#drink-canvas').height();
		var canWidth = $('#drink-canvas').width();
		var canOffset = $('#drink-canvas').offset();
		var numMix = $('.mixer-ing').length;
		var posIndex = $(this).data("posIndex");
		var h = $(this).height();
		var w = $(this).outerWidth(true);
		var left;
		if($(this).offset().left == canWidth - w + canOffset.left)
			left = $(this).offset().left; 
		else
			left = $(this).offset().left - w + canOffset.left;
			
		$(this).offset({left:canOffset.left + canWidth - w, top:canHeight/(numMix+1)*(posIndex+1)-h/2+canOffset.top});
	});
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
			effSum = effSum +  Math.pow((i/lArray.length - j/lArray.length)*10,2)*Math.pow(interactionMatrix.grab(lArray[i], lArray[j]),2)*w[0];
		}
		for(var j = 0; j <mArray.length; j++){
			effSum = effSum +  Math.pow((i/lArray.length - j/mArray.length)*10,2)*Math.pow(interactionMatrix.grab(lArray[i], mArray[j]),2)*w[1];
		}
	}
	for (var i = 0; i < mArray.length; i++){
		for(var j = i; j < mArray.length; j++){
			effSum = effSum +  Math.pow((i/mArray.length - j/mArray.length)*10,2)*Math.pow(interactionMatrix.grab(mArray[i], mArray[j]),2)*w[0];
		}
	}
	return effSum;
}

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
	$('#drink-canvas').attr("height", (docHeight - title_image_height - $("#ing-menu-div").outerHeight()) + 'px');
	$('#drink-canvas').attr("width",docWidth-20);
	
	$('.cocktail-container').css("top", title_image_height + "px");
	$('.cocktail-container').height($(".ing-container").outerHeight());
	$('.cocktail-container').css("left", $('.liquors-container').outerWidth() + 'px');
	$('.cocktail-container').css("right", $('.mixers-container').outerWidth() + 'px');
	
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
	cocktailOptimizeFlag = false;
	var center = {left:$(elem).offset().left+$(elem).width()/2, top:$(elem).offset().top+$(elem).height()/2};
	$(elem).removeClass("cocktail-normal").addClass("cocktail-highlight");
	$(".cocktail-normal").removeClass("cocktail-normal").addClass("cocktail-nonhighlight");
	var ct = cocktailDB[$(elem).data("dbIndex")];
	var liquors = $('.liquor-ing').get();
	for(var l = 0; l<liquors.length; l++){
		if(ct.hasLiquor($(liquors[l]).text()))
			$(liquors[l]).addClass('ingredient-highlight');
		else
			$(liquors[l]).addClass('ingredient-nonhighlight');
	}
	
	var mixers = $('.mixer-ing').get();
	for(var l = 0; l<mixers.length; l++){
		if(ct.hasMixer($(mixers[l]).text()))
			$(mixers[l]).addClass('ingredient-highlight');
		else
			$(mixers[l]).addClass('ingredient-nonhighlight');
	}
	runOnEnterExit(elem, center);
}

function ctMouseExit(elem){
	var center = {left:$(elem).offset().left+$(elem).width()/2, top:$(elem).offset().top+$(elem).height()/2};
	$(elem).removeClass("cocktail-highlight").addClass("cocktail-normal");
	$(".cocktail-nonhighlight").removeClass("cocktail-nonhighlight").addClass("cocktail-normal");
	$('.ingredient-highlight').removeClass('ingredient-highlight ingredient-nonhighlight').addClass('ingredient');
	$('.ingredient-nonhighlight').removeClass('ingredient-nonhighlight').addClass('ingredient')
	runOnEnterExit(elem, center);
}

/**
* Function to be run every time the mouse enters or exits a cocktail div
* performs resizing so that the center of the div is constant
*/
function runOnEnterExit(elem, center){
	var canvasOffset = $(canvas).offset();
	var ctW = $(elem).width();
	var ctH = $(elem).height();
	var c;
	
	//re-position the element so that its center maintains fixed
	$(elem).offset({left:center.left-ctW/2, top:center.top -ctH/2});
	setIngredientPositions();
	setTimeout(drawDrinkCanvas, 1);
}

/*****************************************
HELPER FUNCTIONS
*/////////////////////////////////////////

function checkForOverlap(elem1, elem2, vOffset, hOffset){
	var e1x1, e1y1, e1x2, e1y2, e2x1, e2y1, e2x2, e2y2;
	e1left = $(elem1).offset().left;
	e1top = $(elem1).offset().top;
	e1right = e1left + $(elem1).outerWidth();
	e1bottom = e1top + $(elem1).outerHeight();
	
	e2left = $(elem2).offset().left;
	e2top = $(elem2).offset().top;
	e2right = e2left + $(elem2).outerWidth();
	e2bottom = e2top + $(elem2).outerHeight();
	
	if(e1right + hOffset < e2left)
		return false;
	if(e1left > e2right + hOffset)
		return false;
	if(e1bottom + vOffset < e2top)
		return false;
	if(e1top > e2bottom + vOffset)
		return false;
		
	return true;
}

/**
* Given a value in a range, return a color
*/
function returnRGB(val, outOf, trans){

	hue = 250;

	if (typeof trans == "undefined")
		trans = 1;
	var numColors = hue*6;
	var r, g, b;
	r = g = b = 0;
	var color;
	
	var n = 6;	
	var rem = val%n;
	color = Math.round((val/n + outOf/n*rem)/outOf*numColors);
	
	if (color <hue){
		r = color;
		b = hue;
	}else{
		if(color < hue*2){
			r = hue;
			b = hue*2-color;
		} else {
			if (color < hue*3){
				g = color-hue*2;
				r = hue;
			}else{
				if(color < hue*4){
					g = hue;
					r = hue*4-color;
				}else{
					if(color < hue *5){
						g = hue;
						b = color-hue*4;
					}else{
						b=hue;
						g = hue*6-color;
					}
				}
			}
		}
	}
	
	//var minBright = hue*2;
	//r = getRandomInt(0,hue);
	//g = getRandomInt(minBright-hue-r, hue);
	//b = minBright - r - g;
	
	var i = getRandomInt(0, palette.length-1);
	var col;// = {r:palette[i][0], g:palette[i][1], b:palette[i][2], text:'rgb('+Math.round(palette[i][0]*trans)+','+Math.round(palette[i][1]*trans)+','+Math.round(palette[i][2]*trans)+')'};
	palette.splice(i,1);
	
	col = {r:r, g:g, b:b, text:'rgb('+Math.round(r*trans)+','+Math.round(g*trans)+','+Math.round(b*trans)+')'};
	
	return col;

	
}

function invertColor(c){
	var r = 255 - c.r;
	(r > 128) ? r = 255: r = 0;
	var g = 255 - c.g;
	(g > 128) ? g = 255: g = 0;
	var b = 255 - c.b;
	(b > 128) ? b = 255: b = 0;
	
	var col = {r:r, g:g, b:b, text:'rgb('+r+','+g+','+b+')'};
	
	((r+b+g) > 250*2/2) ? 	col =  {r:0, g:0, b:0, text:'rgb(0,0,0)'} : col =  {r:255, g:255, b:255, text:'rgb(255,255,255)'}; 
	
	return col;
	
}

/**
* Add an alpha channel to an RGB color
*/
function addAtoColor(c, a){
	var r = c.slice(4, c.indexOf(','));
	c = c.slice(c.indexOf(' ')+1);
	var g = c.slice(0, c.indexOf(','));
	c = c.slice(c.indexOf(' ')+1);
	var b = c.slice(0, c.indexOf(')'));
	return 'rgba(' + Math.round(r*a) +','+ Math.round(g*a) +','+ Math.round(b*a) +','+'1)';
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
    
    var entryFactor = 0.3; 
    var lengthFactor = 0;
    
    var controlLength = Math.min(Math.abs(dX), Math.abs(dY))/2*lengthFactor;
    
    if (dir == 'h'){
        cx1 = sx+dX*entryFactor;
        cy1 = sy;
        
        var ddY, ddX;
        ddX = dX - 4*dX*entryFactor;
        controlLength = Math.min(Math.abs(dX), Math.abs(dY))/2*lengthFactor;
        
		curveFactor = 0;
		
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

/**
//Sorts the array V
//Randomly swaps elements with the same value to minimize same answers
*/
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
	
	return {Fx:Fx*getRandomInt(80,120)/100, Fy:Fy*getRandomInt(80,120)/100};
}

var isEven = function(someNumber){
    return (someNumber%2 == 0) ? true : false;
};

function constrain(min, max, value){
	if(value<min)
		return min;
	else if (value>max)
		return max;
	else
		return value;
}