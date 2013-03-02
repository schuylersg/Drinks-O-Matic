//<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script>

var rotation = 0;
var r = 250;
var g = 0;
var b = 0;
var ctx;
var cocktailList = [];
var masterGlassList = [];
var ingredientList = new IngredientList(['Liquor', 'Mixer', 'Garnish']);

Array.prototype.includes = function(item){
	//alert('From Array.includes ' + this);
	for(var i = 0; i < this.length ; i++){
		if(this[i] == item)
			return true;
	}
	return false;
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
					effSum = effSum + Math.abs(this.order[i] - this.order[j])*this.occurances.grab(i,j)*w;
				}
			}
		}
	}
	return effSum
};

IngredientList.prototype.getIndexesOfType = function(type){
	indexes = new Array(this.getNumOfType(type));
	var j = 0;
	for(var i = 0; i<this.ingredients.length; i++){
		if (this.type[i] == type){
			indexes[j] = i;
			j++;
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
			//alert('oob values for lower');
			sortLResults = oob;
		}
		
		if(posToFill[1] < this.ingredients.length){
			sortUResults = this.occurances.sortRow(this.order[posToFill[1]-1]);
		}else{
			//alert('oob values for upper');
			sortUResults = oob;
		}
		
		//alert(sortLResults.value + '\n' + sortLResults.index + '\n' + sortUResults.value + '\n' + sortUResults.index + '\n' + used);
		
		//Find the index of the most occuring indgredient that hasn't already been placed
		lUnusedIndex=0;
		while(used[sortLResults.index[lUnusedIndex]])
			lUnusedIndex++;
		
		uUnusedIndex=0;
		while(used[sortUResults.index[uUnusedIndex]])
			uUnusedIndex++
		
		if(sortLResults.index[lUnusedIndex] == sortUResults.index[uUnusedIndex]){ // if the best result is the same for both unfilled positions
			//randomly assign ingredient to position
			//alert('Equal index');
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
				//alert('Values the same ' + 'r');
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
					//alert('lower > upper');
					this.order[posToFill[0]] = sortLResults.index[lUnusedIndex];
					used[sortLResults.index[lUnusedIndex]] = true;
					posToFill[0]--;
				} else {
					//alert('upper > lower');
					this.order[posToFill[1]] = sortUResults.index[uUnusedIndex];
					used[sortUResults.index[uUnusedIndex]] = true;
					posToFill[1]++;
				}
			}
		}
//		alert(this.ingredients + '\n' + this.order + '\n' + posToFill);
    }
//	alert(this.ingredients + '\n' + this.order + '\n' + posToFill);
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
        this.position[i] = pos;
};

IngredientList.prototype.getPositionByName = function(item){
    var i = this.getIndexByName(item);
    if (i!== null)
        return this.position[i];
};

IngredientList.prototype.setPositionByIndex = function(index, pos){
    if (index >= 0 && index < this.position.length)
        this.position[index] = pos;
};

IngredientList.prototype.setListPositions = function(type,xRange, yRange){
    var midX = (xRange[0] + xRange[1])/2;
    var midY = (yRange[0] + yRange[1])/2;
    var totX = xRange[1] - xRange[0];
    var totY = yRange[1] - yRange[0];
    var elements = this.getNumOfType(type);
    var pos;
    var i;
    
 	
	for (i= 0; i<this.ingredients.length; i++){
		if(this.type[i] == type){
			pos = [xRange[0]+totX/elements*this.order[i] +totX/elements/2 , yRange[0]+totY/elements*this.order[i]+totY/elements/2];
			this.position[i] = pos;
		}
	}
		
};

IngredientList.prototype.toString = function(){
    var str = "";
    for(var i =0; i<this.ingredients.length; i++){
        str = str+this.ingredients[i] + ' : ' + this.order[i] + '\n';// : (' + this.position[i][0] + ',' + this.position[i][1] + '(\n';
    }
    return str;
};

IngredientList.prototype.listLength = function(){
    return this.ingredients.length;
};

function Cocktail(name, liquors, mixers, garnishes, glass){
    this.name = name;
    this.liquors = liquors;
    this.mixers = mixers;
    this.garnishes = garnishes;
    this.glass = glass;
    this.position = [];
}

Cocktail.prototype.hasLiquor = function(liquorName){
    var l;
    for(l in this.liquors){
        if (l == liquorName)
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
    // do stuff when DOM is ready
    var canvas = document.getElementById('drink-canvas');  
    ctx = canvas.getContext('2d'); 
    var cH, cW;
    cH = 500;
    cW = 1000;
    var i, j;
    var textHeight = 10;
    
    //Load cocktails 
    cocktailList.push(new Cocktail("Margarita", ['Tequila', 'Triple Sec'], ['Lime Juice'], [], 'Tall'));
    cocktailList.push(new Cocktail("Whiskey Sour", ['Whiskey'], ['Lemon Juice', 'Simple Syrup'], ['Cherry', 'Lemon Slice'], 'Tall'));
    cocktailList.push(new Cocktail("Mojito", ['Rum'], ['Mint Leaves', 'Simple Syrup', 'Lime Juice', 'Soda'], [], 'Tall'));
    cocktailList.push(new Cocktail('Long Island Iced Tea', ['Vodka', 'Tequila', 'Rum', 'Gin', 'Triple Sec'], ['Sweet and Sour Mix', 'Cola'], [], 'Tall'));
    cocktailList.push(new Cocktail("Rum & Coke", ['Rum'], ['Cola'], ['Cherry'], 'Tall'));
	
    //Generate master lists of ingredients
    $.each(cocktailList, function(index, c){
        ingredientList.addItems(c);
    });
    
	var reallyOldSum = 10000;
	var oldSum;
	var weights = [1,0.75];
	ingredientList.randomizeOrder('Liquor');
	var newSum = ingredientList.calcEfficiency(['Liquor', 'Mixer'], weights);
	var mIndexes = ingredientList.getIndexesOfType('Mixer');
	var lIndexes = ingredientList.getIndexesOfType('Liquor');
	//alert(ingredientList.toString() + '\n' + mIndexes + '\n' + lIndexes);
	
	var tempO;
	
	while(newSum < reallyOldSum){
		reallyOldSum = newSum;
		oldSum = newSum;
		
		//go through liquors
		for(i = 1; i<lIndexes.length; i++){
			tempO = ingredientList.order[lIndexes[i-1]];
			ingredientList.order[lIndexes[i-1]] = ingredientList.order[lIndexes[i]];
			ingredientList.order[lIndexes[i]] = tempO;
			newSum = ingredientList.calcEfficiency(['Liquor', 'Mixer'], weights);
			if((newSum < oldSum) || (newSum == oldSum && Math.random()>0.5)){
				oldSum = newSum;
			}else{
				tempO = ingredientList.order[lIndexes[i-1]];
				ingredientList.order[lIndexes[i-1]] = ingredientList.order[lIndexes[i]];
				ingredientList.order[lIndexes[i]] = tempO;
			}
		}	
		
		//go through mixers
		for(i = 1; i<mIndexes.length; i++){
			tempO = ingredientList.order[mIndexes[i-1]];
			ingredientList.order[mIndexes[i-1]] = ingredientList.order[mIndexes[i]];
			ingredientList.order[mIndexes[i]] = tempO;
			newSum = ingredientList.calcEfficiency(['Liquor', 'Mixer'], weights);
			if(newSum < oldSum){
				oldSum = newSum;
			}else{
				tempO = ingredientList.order[mIndexes[i-1]];
				ingredientList.order[mIndexes[i-1]] = ingredientList.order[mIndexes[i]];
				ingredientList.order[mIndexes[i]] = tempO;
			}
		}	
		//alert('reallyOldSum: ' + reallyOldSum +' newSum: ' + newSum);
	}

	ingredientList.setListPositions('Liquor',[5,5], [5,cH-5]);

    ingredientList.setListPositions('Mixer', [cW-5, cW-5], [5,cH-5]);
    
	//masterGarnishList.setOrder();

    
	//Set cocktail positions
	var c, xPos, yPosL, yPosM;
	var allY = new Array(cocktailList.length);
	var allX = new Array(cocktailList.length);
	
	
	for (c = 0; c<cocktailList.length; c++){
		xPos = 0;
		yPosL = 0;
		yPosM = 0;
		
		for(var cl = 0; cl<cocktailList[c].liquors.length; cl++){
			if(c==6)
				alert(cocktailList[c].liquors[cl] + ' ' + masterLiquorList.getPositionByName(cocktailList[c].liquors[cl])[1]);
			yPosL = yPosL + ingredientList.getPositionByName(cocktailList[c].liquors[cl])[1];
		}
		yPosL = yPosL/cocktailList[c].liquors.length;	
		
		for(var cm = 0; cm<cocktailList[c].mixers.length; cm++){
			if(c==6)
				alert(cocktailList[c].mixers[cm] + ' ' + masterMixerList.getPositionByName(cocktailList[c].mixers[cm])[1]);
			yPosM = yPosM + ingredientList.getPositionByName(cocktailList[c].mixers[cm])[1];
		}
		yPosM = yPosM/cocktailList[c].mixers.length;
		
		allY[c]= (yPosM + yPosL)/2;	
		
		if(c==6)
			alert(cocktailList[c].name + ' '+ yPosL + ' ' + yPosM + ' ' + allY[c]);
	}
	//alert(allY)
	
	var ySorted = sortWithIndex(allY);
	var minX, maxX;
	minX = 300;
	maxX = 700;
	
	
	for (c = 0; c<cocktailList.length; c=c+2){
		allX[ySorted.index[c]] = minX + (maxX-minX)/4*c/2;
		//alert(minX + (maxX-minX)/4*c/2);
	}
	
	for (c = 1; c<cocktailList.length; c=c+2){
		allX[ySorted.index[c]] = maxX - (maxX-minX)/4*c/2;
	}
	
	for (c = 0; c<cocktailList.length; c++){
		
		if (c==6)
			alert(allX[c] + ' '+ allY[c])
		cocktailList[c].position = [allX[c], allY[c]];
		//cocktailList[c].position = [500, allY[c]];
	}
	
	
    var textBuffer = 5;
    var curviness = 0.5;
    
    ctx.font="15px Arial";
    ctx.textAlign="left";
    ctx.textBaseline = "middle";
    for(i = 0; i<lIndexes.length; i++){
        ctx.fillText(ingredientList.ingredients[lIndexes[i]],ingredientList.position[lIndexes[i]][0], ingredientList.position[lIndexes[i]][1]);
    }
    
    ctx.textAlign="right";
    for(i = 0; i<mIndexes.length; i++){
        ctx.fillText(ingredientList.ingredients[mIndexes[i]],ingredientList.position[mIndexes[i]][0], ingredientList.position[mIndexes[i]][1]);
    }
    
	/*
    masterGarnishList.setListPositions([5, cW-5], [cH-15,cH-15]);
    ctx.textAlign="center";
    for(i = 0; i<masterGarnishList.listLength(); i++){
        ctx.fillText(ingredientList.ingredients[i],masterGarnishList.position[i][0], masterGarnishList.position[i][1]);
    }
    */
	
	ctx.textAlign="center";
    var pos;
    $.each(cocktailList, function(index, c){  
        for(i=0; i<c.liquors.length; i++){
            ctx.strokeStyle = 'rgb(255, 0, 0)';
            pos = ingredientList.getPositionByName(c.liquors[i]);
            drawSCurve(pos[0]+ctx.measureText(c.liquors[i]).width+textBuffer, pos[1], 
                c.position[0]-ctx.measureText(c.name).width/2-textBuffer, c.position[1], 
                'h', curviness);
        }  
        
        for(i=0; i<c.mixers.length; i++){
            ctx.strokeStyle = 'rgb(0, 255, 0)';
            pos = ingredientList.getPositionByName(c.mixers[i]);
            drawSCurve(c.position[0]+ctx.measureText(c.name).width/2+textBuffer, c.position[1],
                pos[0]-ctx.measureText(c.mixers[i]).width-textBuffer, pos[1], 
                'h', curviness);
        }
        /*
        for(i=0; i<c.garnishes.length; i++){
            ctx.strokeStyle = 'rgb(255, 0, 255)';
            pos = ingredientList.getPositionByName(c.garnishes[i]);
            drawSCurve(c.position[0], c.position[1]+textHeight/2 + textBuffer,
                pos[0], pos[1] - textHeight/2 - textBuffer, 'v', curviness);
        }
		*/
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.fillText(c.name, c.position[0], c.position[1]);  
    });  

});

function calculateDistances(ct, l, m, w){
	

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

/*
    ctx.beginPath();
    ctx.arc(cx1,cy1,2,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(cx2,cy2,4,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(cx3,cy3,6,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(cx4,cy4,8,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
    
    alert(sx + ' ' + sy + ' ' + mx + ' ' + my + ' ' + fx + ' ' + fy + '\n' + 
       Math.round(cx1) + ' ' + Math.round(cy1)+ ' ' + Math.round(cx2)+ ' ' + Math.round(cy2)+ ' ' + 
        Math.round(cx3)+ ' ' + Math.round(cy3)+ ' ' + Math.round(cx4) + ' ' + Math.round(cy4));
    
    */
}


IngredientList.prototype.swap = function(a, b){
    var tempI, tempC, tempP;
    tempI = this.ingredients[a];
    tempC = this.occurances[a];
    tempP = this.position[a];
    this.ingredients[a] = this.ingredients[b];
    this.ingredients[b] = tempI;
    this.occurances[a] = this.occurances[b];
    this.occurances[b] = tempC;
    this.position[a] = this.position[b];
    this.position[b] = tempP;
};

IngredientList.prototype.sort = function(){
  var sorting = true;
  var i = 0;
  while(sorting){
    sorting = false;
    for(i = 1; i<this.ingredients.length; i++){
        if (this.occurances[i] > this.occurances[i-1]){
            this.swap(i, i-1);
            sorting = true;
        }
    }
  }
};


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

Array.prototype.removeDuplicates = function(){
  this.sort();
  for (var i = 1; i<this.length; i++){
    if(this[i-1] == this[i]){
        this.splice(i,1);
        i = i -1;
    }
  }
};