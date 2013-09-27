
// Solve Every Sudoku Puzzle

// Javascript port of Peter Norvig's excellent Sudoku solver.
// See http://norvig.com/sudoku.html for his article and explanations.

// Throughout this program we have:
//   r is a row,    e.g. 'A'
//   c is a column, e.g. '3'
//   s is a square, e.g. 'A3'
//   d is a digit,  e.g. '9'
//   u is a unit,   e.g. ['A1','B1','C1','D1','E1','F1','G1','H1','I1']
//   grid is a grid,e.g. 81 non-blank chars, e.g. starting with '.18...7...
//   values is a dict of possible values, e.g. {'A1':'12349', 'A2':'8', ...}

function cross(A, B) {
	var result = [];
	for (var i=0; i < A.length; i++) {
		for (var j = 0; j < B.length; j++) {
			result.push(A[i]+B[j]);
		}
	}
	return result;
}

var digits = '123456789';
var letters = 'ABCDEFGHI';
var rows = chars(letters);
var cols = chars(digits);
var squares = cross(rows, cols);
var unitlist = [];
var units = {};
var peers = {};
each(rows, function(r) {
	unitlist.push(cross([r], cols));
});
each(cols, function(c) {
	unitlist.push(cross(rows, [c]));
});
each(['ABC','DEF','GHI'], function(rs) {
	each(['123','456','789'], function(cs) {
		unitlist.push(cross(chars(rs), chars(cs)));
	});
});

each(squares, function(s) {
	units[s] = filter(unitlist, function(u) { return contains(u, s); });
});

each(squares, function(s) {
	var result = [];
	peers[s] = set(filter(Array.prototype.concat.apply([], units[s]), function (s2) { return s2 != s; }));
});

//############## Unit Tests ################

function assert(val) {
	if (!val) {
		throw Error('Assert failed');
	}
}

function test() {
	assert(squares.length == 81);
	assert(unitlist.length == 27);
	assert(all(map(squares), function(s) { return units[s].length == 3; }));
	assert(all(map(squares), function(s) { return peers[s].length == 20; }));
	
	var sunits = map(units['C2'], function(u) { return u.toString(); });
	assert(contains(sunits, 'A2,B2,C2,D2,E2,F2,G2,H2,I2')
		&& contains(sunits, 'C1,C2,C3,C4,C5,C6,C7,C8,C9')
		&& contains(sunits, 'A1,A2,A3,B1,B2,B3,C1,C2,C3'));
	
	assert(all(['A2', 'B2', 'D2', 'E2', 'F2', 'G2', 
				'H2', 'I2', 'C1', 'C3', 'C4', 'C5', 
				'C6', 'C7', 'C8', 'C9', 'A1', 'A3', 
				'B1', 'B3'],
				function(s) { return contains(peers['C2'], s); }));
						   
	print('All tests pass');
}

//################ Parse a Grid ################

function parseGrid(grid) {
	//Convert grid to a dict of possible values, {square: digits}, or
	//return false if a contradiction is detected

	// To start, every square can be any digit; then assign values from the grid.
	var values = {}; 
	each(squares, function(s) { values[s] = digits; });
	
	var input = gridValues(grid);
	for (var s in input) {
		var d = input[s];
		if (digits.indexOf(d) != -1 && !assign(values, s, d)) {
			return false; // (Fail if we can't assign d to square s.)
		}
	}
	return values;	
}

function gridValues(grid) {
    //Convert grid into a dict of {square: char} with '0' or '.' for empties.
	grid = grid.replace(/[^0-9\.]/g, '');
	assert(grid.length == 81);
    return dict(squares, grid)
}

//################ Constraint Propagation ################

function assign(values, s, d) {
	//Eliminate all the other values (except d) from values[s] and propagate.
	//Return values, except return false if a contradiction is detected.
	var otherValues = values[s].replace(d, '');
	if (all(chars(otherValues), function(d2) { return eliminate(values, s, d2); })) {
		return values;
	} else {
		return false;
	}
}

function eliminate(values, s, d) {
	//Eliminate d from values[s]; propagate when values or places <= 2.
	//return values, except return false if a contradiction is detected.
	
	if (values[s].indexOf(d) == -1) {
		return values; //Already eliminated
	}
	
	values[s] = values[s].replace(d, '');
	// (1) If a square s is reduced to one value d2, then eliminate d2 from the peers.
	if (values[s].length == 0) {
		return false; //Contradiction: removed last value
	} else if (values[s].length == 1) {
		var d2 = values[s];
		if (!all(peers[s], function(s2) { return eliminate(values, s2, d2); })) {
			return false;
		}
	}
	// (2) If a unit u is reduced to only one place for a value d, then put it there.
	for (var i=0; i < units[s].length; i++) {
		var u = units[s][i];
		var dplaces = filter(u, function(s2) { return values[s2].indexOf(d) != -1; });
		if (dplaces.length == 0) {
			return false; //Contradiction: no place for this value
		} else if (dplaces.length == 1) {
			// d can only be in one place in unit; assign it there
			if (!assign(values, dplaces[0], d)) {
				return false;
			}
		}
	}
	return values;
}

// ################ Display as 2-D grid ################

function display(values) {
	//Display these values as a 2-D grid.
	var width = max(vals(values), 'length');
	var lines = [];
	for (var ri=0; ri < rows.length; ri++) {
		var r = rows[ri];
		var line = '';
		for (var ci=0; ci < cols.length; ci++) {
			var c = cols[ci];
			line += center(values[r+c], width);
			if (c == '3' || c == '6') {
				line +='|';
			} else if (c != '9') {
				line += ' ';
			}
		}
		lines.push(line);
		if (r == 'C' || r == 'F') {
			lines.push('x+x+x'.replace(/x/g, repeat('-', width*3+2)));
		}
	}
	print(lines.join('\r\n'));
}

// ################ Search ################

function solve(grid) {
	return search(parseGrid(grid));
}

function search(values) {
	//Using depth-first search and propagation, try all possible values."
	if (values === false) {
		return false; //Failed earlier
	}
	
	if (all(squares, function(s) { return values[s].length == 1; })) {
		return values; // Solved!
	}
	
	//Chose the unfilled square s with the fewest possibilities
	var candidates = filter(squares, function(s) { return values[s].length > 1; });
	candidates.sort(function(s1,s2) { return values[s1].length - values[s2].length; });
	var s = candidates[0];
	return some(chars(values[s]), function(d) { return search(assign(copy(values), s, d)) });
}

// ################ Utilities ################

function some(seq, func) {
	//Return some element ofseq that is true.
	for (var i=0; i < seq.length; i++) {
		var result = func(seq[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

function fromFile(filename, sep) {
    // Parse a file into a list of strings, separated by sep.
	sep = sep || '\n';
	var txt = require('fs').readFileSync(filename).toString();
	return filter(txt.replace(/^\s*|\s*$/g, '').split(sep), function(l) { return l.length > 0; });
}

function shuffled(seq) {
    //Return a randomly shuffled copy of the input sequence.
    seq = map(seq, function(x) { return x;});
	//Fisher yates shuffle
	var i = seq.length;
	while (--i) {
		var j = Math.floor(Math.random() * (i + 1));
		var ival = seq[i];
		var jval = seq[j];
		seq[i] = jval;
		seq[j] = ival;
	}
	
    return seq
}

// ################ System test ################

function solveAll(grids, name, showif) {
    // Attempt to solve a sequence of grids. Report results.
    // When showif is a number of seconds, display puzzles that take longer.
    // When showif is None, don't display any puzzles.
    
	name = name || '';
	showif = showif || 0.0;
	
	function timeSolve(grid) {
		var start = new Date().getMilliseconds();
        var values = solve(grid);
        var t = new Date().getMilliseconds()-start;
        // Display puzzles that take long enough
        if (showif && t > showif) {
            display(gridValues(grid));
            if (values) {
				display(values);
			}
            print('(' + Math.round(t/1000, 2) + ' seconds)\n'); 
		}
        return [t, solved(values)];
	}
	var times = [], results = [];
	each(grids, function(grid) {
		var result = timeSolve(grid);
		times.push(result[0]);
		results.push(result[1]);
	});
    var N = grids.length;
	var seconds = function(nr) { return (nr/1000).toFixed(2); };
    if (N > 1) {
        print('Solved ' + sum(results) + ' of ' + N + ' ' + name + ' puzzles '
		+ '(avg ' + seconds(sum(times)/N) + ' secs'
		+ ' (' + Math.round(N/sum(map(times,function(n) { return n/1000;})),0) + ' Hz), '
		+ 'max ' + seconds(max(times)) + ' secs).');
	}
}

function solved(values) {
    // A puzzle is solved if each unit is a permutation of the digits 1 to 9.
    function unitsolved(unit) {
		var udigits = map(unit, function(s) { return values[s];});
		udigits.sort();
		return udigits.join('') == digits;
	}
    return values !== false && all(unitlist, function(unit) { return unitsolved(unit); });
}

function randomPuzzle(N) {
    // Make a random puzzle with N or more assignments. Restart on contradictions.
    // Note the resulting puzzle is not guaranteed to be solvable, but empirically
    // about 99.8% of them are solvable. Some have multiple solutions.

	N = N || 17;
	var values = {};
	each(squares, function(s) { values[s] = digits; });

	var shuffledSquares = shuffled(squares);
    for (var i = 0; i < shuffledSquares.length; i++) {
		var s = shuffledSquares[i];
        if (!assign(values, s, values[s].charAt(randomInt(0, values[s].length)))){
            break;
		}
        var ds = filter(map(squares, function(s) { return values[s]; }), function(sd) { return sd.length == 1;});
        if (ds.length >= N && set(ds).length >= 8) {
            return map(squares, function(s) { return values[s].length == 1 ? values[s] : '.'; }).join('');
		}
	}
    return randomPuzzle(N) // Give up and make a new puzzle
}

var grid1  = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';
var grid2  = '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......';
var hard1  = '.....6....59.....82....8....45........3........6..3.54...325..6..................';

function main() {
	test();
	solveAll(fromFile('easy50.txt', '========'), 'easy');
	solveAll(fromFile('top95.txt'), 'hard');
	solveAll(fromFile('hardest.txt'), 'hardest');
	solveAll(map(range(99), function() { return randomPuzzle();}), 'random', 100.0);
}
main();

// References used:
// http://www.scanraid.com/BasicStrategies.htm
// http://www.sudokudragon.com/sudokustrategy.htm
// http://www.krazydad.com/blog/2005/09/29/an-index-of-sudoku-strategies/
// http://www2.warwick.ac.uk/fac/sci/moac/currentstudents/peter_cock/python/sudoku/


// ######### Below here are only utility functions, to make up 
// ######### for javascript's lack of a decent standard library

function vals(obj) {
	var result = [];
	for (var key in obj) {
		result.push(obj[key]);
	}
	return result;
}

function keys(obj) {
	var result = [];
	for (var key in obj) {
		result.push(key);
	}
	return result;
}

function each(list, func) {
	filter(list, func);
}

function dict(keys, values) {
	var result = {};
	each(keys, function(i, key) {
		result[key] = values[i];
	});
	return result;
}

function print(s) {
	console.log(s + '\r\n');
}

function all(list, func) {
	for (var i=0; i < list.length; i++) {
		if (!func(list[i])) {
			return false;
		}
	}
	return true;
}

function any(list, func) {
	for (var i=0; i < list.length; i++) {
		var result = func(list[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

function filter(list, func) {
	var result = [];
	for (var i=0; i < list.length; i++) {
		if (func.length > 1 ) {
			if (func(i, list[i])) {
				result.push(list[i]);
			}
		} else if (func(list[i])) {
			result.push(list[i]);
		}
	}
	return result;
}

function sum(list) {
	var result = 0;
	each(list, function(l) {
		if (typeof l == 'number') {
			result += l;
		} else if (typeof l == 'boolean') {
			result += l ? 1 : 0;
		} else {
			throw 'Only numbers and booleans supported';
		}
	});
	return result;
}

function first(list, func) {
	var result = [];
	for (var i=0; i < list.length; i++) {
		if (func.length > 1 ) {
			if (func(i, list[i])) {
				return list[i];
			}
		} else if (func(list[i])) {
			return list[i];
		}
	}
	return null;
}

function map(list, expr) {
	var result = [];
	each(list, function(value) {
		if (typeof expr === 'function') {
			result.push(expr(value));
		} else if (typeof expr === 'string') {
			result.push(value[expr]);
		}
	});
	return result;
}

function max(list, expr) {
	var maxValue;
	
	each(list, function(value) {
		var candidate;
		if (typeof expr === 'undefined') {
			candidate = value;
		} else if (typeof expr === 'string') {
			candidate = value[expr];
		} else if (typeof expr === 'function') {
			candidate = expr(value);
		}
		
		if (typeof maxValue === 'undefined' || candidate > maxValue) {
			maxValue = candidate;
		}
	});
	return maxValue;
}

function min(list, expr) {
	var minValue;
	
	each(list, function(value) {
		var candidate;
		if (typeof expr === 'undefined') {
			candidate = value;
		} else if (typeof expr === 'string') {
			candidate = value[expr];
		} else if (typeof expr === 'function') {
			candidate = expr(value);
		}
		
		if (typeof minValue === 'undefined' || candidate < minValue) {
			minValue = candidate;
		}
	});
	return minValue;
}


function contains(list, val) {
	return any(list, function(x) { return x === val; });
}

function set(list) {
	var result = [];
	each(list, function(val) {
		if (!contains(result, val)) {
			result.push(val);
		}
	});
	return result;
}

function concat() {
	return Array.prototype.concat.apply([], arguments);
}

function repeat(str, times) {
	return Array(times+1).join(str);
}

function center(str, width) {
	var pad = width - str.length;
	if (pad <= 0) {
		return str;
	}
	return repeat(' ', Math.floor(pad / 2)) 
		+ str 
		+ repeat(' ', Math.ceil(pad / 2));
}

function copy(board) {
	return dict(keys(board), vals(board));
}

function randomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function range(count) {
	var result = [];
	for (var i=0; i < count; i++) {
		result.push(i);
	}
	return result;
}

function chars(string) {
	//Old versions of jscripts don't support [] for strings, so we must turn them into arrays
	var result = [];
	for (var i = 0; i < string.length; i++) {
		result.push(string.charAt(i));
	}
	return result;
}