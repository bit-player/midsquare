'use strict';
/*
 * Demo of middle-square pseudo-random number generator,
 * with numbers of four decimal digits.
 *
 * Code by Brian Hayes, July 2022.
 */

{ // block for private namespace

	// GLOBALS

	var status = "empty";  // also running, paused, stuck

	var seedInputStr = "";   // content of the input element in the controls div
	var seed = "";           // four-decimal-digit string; remains constant throught run
	var rStr = "";           // current random iterate, as a four-decimal-digit string
	var rNum = 0;            // current random iterate, as a JS number
	
	var rngTimer = null;
	
	var rNumHistory = new Uint8Array(10000);   // keep track of each rNum in the sequence
	
	var digitset = new Set("0123456789");      // for testing keyboard inputs (only digits allowed)
	
	
	// Get references to DOM elements
	
	const scroller = document.getElementById("scroller");
	const integers = document.getElementById("integers");
	
	const stopGoButton = document.getElementById("stop-go");
	stopGoButton.addEventListener('click', doStopGoButton);
	
	const clearButton = document.getElementById("clear");
	clearButton.addEventListener('click', doClearButton);
	
	const seedInput = document.getElementById("seed-entry");
	seedInput.addEventListener('input', digitInput);
	seedInput.addEventListener('click', doClearButton);
	const seedInputTextField = document.getElementById("seed-text-box");
	
	window.addEventListener('keypress', doEnterKey); 
	
	
	// one function to deal with all the enabling and disabling
	// of UI elements depending on the state of the program
	
	function updateUI() {
		if (status === "empty" ) {
			stopGoButton.innerHTML = "Go";
			enableUI([stopGoButton]);
			disableUI([clearButton]);
		}
		else if (status === "running") {
			stopGoButton.innerHTML = "Stop";
			enableUI([stopGoButton]);
			disableUI([clearButton]);
		}
		else if (status === "paused") {
			stopGoButton.innerHTML = "Go";
			enableUI([clearButton, stopGoButton]);
		}
		else if (status === "stuck") {
			stopGoButton.innerHTML = "Go";
			disableUI([stopGoButton]);
			enableUI([clearButton]);
		}
	}
	
	// the enable and disable functions invoked above
	
	function disableUI(uiArray) {
		for ( var i = 0 ; i < uiArray.length ; i++ ) {
			var elt = uiArray[i];
			if ( !elt.disabled ) {
				elt.disabled = "disabled";
			}
		}
	}
	
	function enableUI(uiArray) {
		for ( var i = 0 ; i < uiArray.length ; i++ ) {
			var elt = uiArray[i];
			if ( elt.disabled ) {
				elt.removeAttribute("disabled");
			}
		}
	}
	
	// We take input to the seed-value box one character at a time (i.e., using the
	// 'input' event rather than the 'change' event. This allows for an easy way
	// to refuse any characters after the fourth, and to ignore any typed characters
	// that aren't decimal digits. No error messages are ever needed.	
	
	function digitInput(evt) {
		const charsAsTyped = evt.target.value;               // raw input received so far
		let sanitizedChars = "";
		for (let i = 0; i < charsAsTyped.length; i++) {      // after each event, check for bad chars or overlength
			let ch = charsAsTyped[i];
			if (digitset.has(ch) && i < 4) {
				sanitizedChars += ch;
				seedInputStr = sanitizedChars;                   // store in global var
			}
		}
		evt.target.value = sanitizedChars;                   // display in the input text field
	}
		

	// What happens when the "Go" (or "Stop") button is clicked.
	// The response depends on the value of the 'status' variable.
	// Note the absense of a clause for 'status === "stuck"'; not
	// needed because the button is disabled in that state.

	function doStopGoButton() {
		if (status === "empty") {         // blank scroller panel, ready to start
			if (seedInputStr === "") {      // the user has not given us a seed value ...
				seed = randomSeed();          // ... so generate a random one
			}
			else {
				seed = padLeftWithZeros(seedInputStr, 4);   // we have a seed, may need leading zeros for display
			}
			seedInputTextField.value = seed;  // display the seed in the input text field
			rStr = seed;                      // the seed will be the zeroth random iterate
			rNum = parseInt(rStr, 10);        // convert to number
			status = "running";               // set new status
			updateUI();                       // enable/disable buttons
			rNumHistory[rNum] += 1;           // mark the seed value as dirty
			displayLine("&nbsp;&nbsp;", rStr, "&nbsp;&nbsp;");   // now show the seed as zeroth line in scroller panel
			rngTimer = setInterval(doMidSquare, 50);   // start timer that will generate one iterate every 50 msec
		}
		else if (status === "running") {    // the program is already running; so stop it
			clearInterval(rngTimer);          // no more iterates
			status = "paused";                // 'paused' allows us to resume if wanted
			updateUI();                       // enable/disable buttons
		}
		else if (status === "paused") {     // we're paused, so pressing the Go button means resume
			status = "running";               // here we go again
			updateUI();
			rngTimer = setInterval(doMidSquare, 50);
		}
	}
	
	// For convenience, make the enter key a synonym for the Go button.
	
	function doEnterKey(evt) {
		if (evt.key === "Enter") {
			doStopGoButton(evt);
		}
	}
	
	
	
	// The clear button causes a total reset, deleting any existing
	// iterates displayed in the scroller, as well as the current seed.
	// Furthemore, the function is invoked not only by the button but
	// also by clicking in the seed-input text field.
	
	function doClearButton() {
		seedInputTextField.value = "";
		seedInputStr = "";
		clearInterval(rngTimer);
		seed = "";
		rStr = "";
		rNum = 0;
		rNumHistory = new Uint8Array(10000);
		integers.innerHTML = "";
		status = "empty";
		updateUI();
	}
	
	// If the user has not provided a seed, generate a pseudorandom one,
	// using the JavaScript RNG.
	
	function randomSeed() {
		return padLeftWithZeros(Math.floor(Math.random() * 10000).toString(), 4);
	}
	
	// Now it's time to implement the middle-square algorithm. For the
	// most part we're working with strings of digits, not numbers. The
	// string representation makes it easy to extract the middle digits.
	// The only place where the numeric representation is needed is in
	// the squaring part of the algorithm. 
	
	// Note that these procedures are written to handle numbers and strings
	// of any width/length, although in the present context the random
	// iterate will always be four digits and the square eight digits.
	

	// Given a string of N digits, parse it as a base-10 integer, calculate
	// the square, then convert back to string form. If the square has fewer
	// than 2N digits, pad on the left with 0 digits.
	
	function squareNumStr(xStr) {
		const len = xStr.length;
		const xNum = parseInt(xStr, 10);
		const sqrNum = xNum * xNum;
		const sqrStr = padLeftWithZeros(sqrNum.toString(10), 2 * len);
		return sqrStr;
	}
	
	function padLeftWithZeros(numStr, len) {
		while (numStr.length < len) {
			numStr = "0" + numStr;
		}
		return numStr
	}
	
	// Take a string of 2N digits and break it apart into a prefix,
	// a midfix, and a postfix -- the hi, mid, and lo sequences of
	// digits.
	
	// If N is even (so that 2N is divisible by 4), the results will
	// be symmetric, and the string of middle digits will always be
	// of length N. For example, '1234' is split as '1', '23', '4',
	// and '12345678' yields '12', '3456', '78'. In other cases, the
	// procedure tries to do something sensible. The string '1234567890'
	// gets broken into '12', '34567', '890'.

	function splitSquare(numStr) {
		const len = numStr.length;
		const midsize = Math.floor(len / 2);
		const highsize = Math.floor(midsize / 2);
		const	lowsize = len - midsize - highsize;
		const hi = numStr.substring(0, highsize);
		const mid = numStr.substring(highsize, highsize + midsize);
		const lo = numStr.substring(highsize + midsize, len);
		return [hi, mid, lo];
	}

	// Given the three substrings (hi, mid, lo), write them to the DOM
	// for display in the scroller panel.
	
	// Note that each line will also have a line number, but that's
	// done entirely by CSS, with no visible presence in the JavaScript.

	function displayLine(hi, mid, lo) {
		const numParagraph = document.createElement("p");   // create a paragraph for each line ...
		numParagraph.classList.add("num-p");
		const hiSpan = document.createElement("span");      // then a span for each segment
		hiSpan.classList.add("hi-digits");                  // classes are picked up by CSS for styling
		hiSpan.innerHTML = hi;
		numParagraph.appendChild(hiSpan);
		const midSpan = document.createElement("span");
		midSpan.classList.add("mid-digits");
		midSpan.innerHTML = mid;
		numParagraph.appendChild(midSpan);
		const loSpan = document.createElement("span");
		loSpan.classList.add("lo-digits");
		loSpan.innerHTML = lo;
		numParagraph.appendChild(loSpan);
		integers.appendChild(numParagraph);
		scroller.scrollTop += 28;                           // scroll up by line height, to keep the
	}                                                     //   bottom of the list in view
	

  // The function called every 50 milliseconds by the timer, to add
	// one more square and its middle-digits random iterate to the list.

	function doMidSquare() {
		const sqr = squareNumStr(rStr);              // rStr is the globally saved value of the current interate; square it
		const [hi, mid, lo] = splitSquare(sqr);      // break the square into hi, mid, and low segments
		displayLine(hi, mid, lo);
		rStr = mid;                                  // update the global with the newly extracted mid digits
		rNum = parseInt(mid, 10);                    // get and save numeric form of the new iterate
		if (rNumHistory[rNum] > 0) {                 // check to see if we've been here before
			interruptCycle();                          // if so, the sequence has entered a cycle and we're done
		}
		else {
			rNumHistory[rNum] += 1;                    // otherwise mark the entry as dirty
		}
	}
	
	// Every mid-square sequence must eventually enter a repeating cycle,
	// after 10^N iterates if not before. (In practice, it's always before.)
	// We detect the onset of cycling in the simple brute-force way, by
	// setting a dirty bit whenever a value appears in the sequence, and
	// checking each value to see if its dirty bit is already set. When a
	// cycle is detected, we want to stop the program and mark the set of
	// iterates that would be repeated forever if execution were allowed to
	// continue.
	
	function interruptCycle() {
		clearInterval(rngTimer);                              // stop looping
		status = "stuck";
		updateUI();                                           // only "Clear" is an option here
		let lastLine = integers.lastChild;                    // get the final iterate, which is the first to repeat
		let midSpan = lastLine.querySelector(".mid-digits");
		let matchValue = midSpan.innerHTML;                   // this is the repeating N-digit string
		midSpan.classList.add("cyclic");                      // mark visibly as part of a repeating cycle
		while (true) {                                        // now go backwards up through the list of
			lastLine = lastLine.previousSibling;                // iterates, marking them all as cyclic until
			midSpan = lastLine.querySelector(".mid-digits");    // we come to another entry whose middle digits
			if (midSpan.innerHTML !== matchValue) {             // match 'matchValue'.
				midSpan.classList.add("cyclic");
			}
			else {
				break;                                            // we've found the match, so we're done
			}
		}
	}
  
} // end of outer namespace block
