num_floats = 0;
xPos = new Array();
yPos = new Array();

var positions = [];
var forces = [];
var positionChange;
var leftMin;
var leftMax;


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

$(document).ready(function() {
	$('#float_area').width(window.innerWidth*0.95);
	$('#float_area').height((window.innerHeight - $("#add-item").height())*0.95);

	
	$("#add-item").click(function(){
		num_floats++;
		var str;
		$("<div class='floating_div' id='float_"+num_floats+"'>Hello"+num_floats+"</div>").insertBefore('#dummy');
		str = "#float_"+num_floats;
		$(str).css('left', constrain(Math.random()*$('#float_area').width(), 50,$('#float_area').width()-50)  + "px");
		$(str).css('top', constrain(Math.random()*$('#float_area').height(), 50, $('#float_area').height()-50) + "px");
		setFloatPositions();
	});
});

function setFloatPositions(){
	calcForces();
	positionChange = 0;
	
	$(".floating_div").each(function (index, domEle) {
			var left = constrain(parseFloat($(this).css('left').substr(0, $(this).css('left').length-2)) + forces[index].x(), 50, $('#float_area').width()-50);
			var top = constrain(parseFloat($(this).css('top').substr(0, $(this).css('top').length-2)) + forces[index].y(), 50, $('#float_area').height()-50);
			positionChange = positionChange + Math.sqrt(Math.pow($(this).css('left').substr(0, $(this).css('left').length-2) - left, 2) + 
				Math.pow($(this).css('top').substr(0, $(this).css('top').length-2) - top,2));
			//console.log($(this).css('left').substr(0, $(this).css('left').length-2));
			$(this).css('left', left + "px");
			$(this).css('top', top + "px");
			if(left < 5 || top < 5)
				alert(left + " " + top);
		//console.log(left);
		});
	
	if(positionChange > 1)
		setTimeout(setFloatPositions, 30);
}

function calcForces() {
	positions = [num_floats];
	forces = [num_floats];
	$(".floating_div").each(function (index, domEle) {
		positions[index] = new Position($(this).css('left').substr(0, $(this).css('left').length-2), $(this).css('top').substr(0, $(this).css('top').length-2));
		//console.log(positions[index].x());
	});

	for(var i = 0; i<num_floats; i++){
		forces[i] = new Position(0, 0);
		for(var j = 0; j < num_floats; j++){
			if(i!=j){
				var f = calcForce(positions[i], positions[j], 100000);
				forces[i].x( forces[i].x() + f.Fx);
				forces[i].y( forces[i].y() + f.Fy);
			}
		}
		//four walls
		var f = calcForce(positions[i], new Position(0,  positions[i].y()), 1000000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( $('#float_area').width()+1,  positions[i].y()), 1000000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( positions[i].x(), 0), 100000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( positions[i].x(),  $('#float_area').height()+1), 50000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		
		//Four corners
		/*
		var f = calcForce(positions[i], new Position(0,0), 100000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( 0,  $('#float_area').height()), 100000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( $('#float_area').width(), 0), 100000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		var f = calcForce(positions[i], new Position( $('#float_area').width(),  $('#float_area').height()), 100000);
		forces[i].x( forces[i].x() + f.Fx);
		forces[i].y( forces[i].y() + f.Fy);
		*/
	}
}

function calcForce(i,j, charge){

	//if (i == j)
	//	return 0;
	
	var dX, dY, theta, F, Fx, Fy;
		
	dX = i.x() - j.x();
	dY = i.y() - j.y();
	theta = Math.abs(Math.atan(dY/dX));
	
	if(dX ==0 && dY == 0)
		return {Fx:0, Fy:0};
	
	F = 1/(dX*dX + dY*dY)*charge;	
		
	if(dX>0)	
		Fx = F*Math.cos(theta);
	else
		Fx = -1*F*Math.cos(theta);
		
	if(dY>0)
		Fy = F*Math.sin(theta);
	else
		Fy = -1*F*Math.sin(theta);
	
	//if((Fy))
		//console.log("i: " + i + " j: " + j + " dX: " + dX + " dY: " + dY +  " Theta: " + theta + " Fx: " + Fx + " Fy: " + Fy);	
	
	return {Fx:Fx, Fy:Fy};
}

function constrain(a, min, max){
	if(a<min){
		return min;
	}
	if(a > max){
		return max;
	}
	return a;
}
