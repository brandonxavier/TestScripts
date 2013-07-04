/*
*  Title:		Token Keno
*  Author:		Calvin06
*  Version: 	1.0 (02/08/13)
*  Summary:		
Tip the amount of each number on the board. Reach goal by clearing the board. Uncover prizes that 
have been set by the broadcaster and randomly placed under some numbers.

*  				
*  Description:
Start by setting a goal description. Set the number of tip numbers to place on the board (up to 100). 
Optionally set prizes that will be randomly placed under board numbers.

Example Number of Board Squares / Total Tips Earned if cleared:
 10 / 55
 25 / 325
 30 / 465 (default)
 50 / 1275
 100 / 5050

List of commands:
   !b = See the token board status
   !p  = See the prizes remaining on the board



Status:
-------------------------
04/24/13 - Update: Allows for hard placement of prizes on the board, otherwise randomly placed

02/13/13 - Beta testing, any and all feedback welcome!

-- Calvin06

*  TODO:
*  When chatNotice supports styles, color code the tipped vs. not tipped numbers on the board
*
*/

// vars
var total_tipped = 0;
var high_tip_username = null;
var high_tip_amount = 0;
var last_tip_username = null;
var last_tip_amount = 0;

var COMMAND_BOARD_STATUS = '!b';
var COMMAND_PRIZES = '!p';

var CONFIG_COLOR_FIRST_PLACE = '#FFF700';
var CONFIG_ADVERT_MINUTES = 10;
var nl = '--------------------------------------------';
var description = 'Token Keno running!';
var firstTimeInit = true;

var userTipTotals = {};
var boardNumbers = new Array();
var boardPrizes = {};
var userPrizes = new Array();

cb.settings_choices = [
    {name: 'boardnumbermax', type: 'int', minValue: 10, maxValue: 120, defaultValue: 30, label: 'Highest Number on Board'},
    {name: 'boardnumbermin', type: 'int', minValue: 1, maxValue: 100, defaultValue: 1, label: 'Lowest Number on Board'},
    {name: 'goal_description', type: 'str', minLength: 1, maxLength: 255, label: 'Cleared Board Goal Description'},
    {name:'multitip', type:'choice',
        choice1:'yes',
        choice2:'no', defaultValue:'yes', label: "Call next highest available numbers with big tips?"},
    {name:'prize1', type:'str', minLength: 1, maxLength: 255, label: 'Prize 1 '},
    {name:'prize1num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 1 # (leave #\'s blank for random assignment)', required: false},
    {name:'prize2', type:'str', minLength: 0, maxLength: 255, label: 'Prize 2 ', required: false},
    {name:'prize2num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 2 #', required: false},
    {name:'prize3', type:'str', minLength: 0, maxLength: 255, label: 'Prize 3 ', required: false},
    {name:'prize3num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 3 #', required: false},
    {name:'prize4', type:'str', minLength: 0, maxLength: 255, label: 'Prize 4 ', required: false},
    {name:'prize4num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 4 #', required: false},
    {name:'prize5', type:'str', minLength: 0, maxLength: 255, label: 'Prize 5 ', required: false},
    {name:'prize5num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 5 #', required: false},
    {name:'prize6', type:'str', minLength: 0, maxLength: 255, label: 'Prize 6 ', required: false},
    {name:'prize6num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 6 #', required: false},
    {name:'prize7', type:'str', minLength: 0, maxLength: 255, label: 'Prize 7 ', required: false},
    {name:'prize7num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 7 #', required: false},
    {name:'prize8', type:'str', minLength: 0, maxLength: 255, label: 'Prize 8 ', required: false},
    {name:'prize8num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 8 #', required: false},
    {name:'prize9', type:'str', minLength: 0, maxLength: 255, label: 'Prize 9 ', required: false},
    {name:'prize9num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 9 #', required: false},
    {name:'prize10', type:'str', minLength: 0, maxLength: 255, label: 'Prize 10 ', required: false},
    {name:'prize10num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 10 #', required: false},
    {name:'prize11', type:'str', minLength: 0, maxLength: 255, label: 'Prize 11 ', required: false},
    {name:'prize11num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 11 #', required: false},
    {name:'prize12', type:'str', minLength: 0, maxLength: 255, label: 'Prize 12 ', required: false},
    {name:'prize12num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 12 #', required: false},
    {name:'prize13', type:'str', minLength: 0, maxLength: 255, label: 'Prize 13 ', required: false},
    {name:'prize13num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 13 #', required: false},
    {name:'prize14', type:'str', minLength: 0, maxLength: 255, label: 'Prize 14 ', required: false},
    {name:'prize14num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 14 #', required: false},
    {name:'prize15', type:'str', minLength: 0, maxLength: 255, label: 'Prize 15 ', required: false},
    {name:'prize15num', type:'int', minValue: 1, maxValue: 100, label: 'Prize 15 #', required: false}
];


//handlers
cb.onTip(function(tip) {
	// track total tips
	total_tipped += tip['amount'];
	last_tip_username = tip['from_user'];
	last_tip_amount = tip['amount'];
 
	handleTip(tip['amount'],tip['from_user']);
	
	cb.drawPanel();
});


cb.onDrawPanel(function(user) {
 return {
     'template': '3_rows_of_labels',
     'row1_label': 'Board Count:',
     'row1_value': '' + tipsRemaining() + ' #s / ' + prizesRemaining() + ' prizes',
     'row2_label': 'Tip Count:',
     'row2_value': '' + total_tipped + ' / ' + getTipCount(),
     'row3_label': 'MVP Tipper:',
     'row3_value': formatUsername(high_tip_username) + ' (' + high_tip_amount + ')'
 };
});

cb.onMessage(function (msg) {
	// user commands
	if (msg['m'].indexOf(COMMAND_BOARD_STATUS) > -1) {
		cb.log('cmd received: ' + COMMAND_BOARD_STATUS);
		if (msg['has_tokens'] || msg['user'] == cb.room_slug || msg['is_mod']) {
			drawBoard();
		} else {
			msg['m'] = msg['m'] + " (token keno: only blues can use this command)";
		}
	}
	if (msg['m'].indexOf(COMMAND_PRIZES) > -1) {
		cb.log('cmd received: ' + COMMAND_PRIZES);
		var prizeText = drawPrizes();
		if (msg['has_tokens'] || msg['user'] == cb.room_slug || msg['is_mod']) {
			cb.chatNotice(prizeText);
		} else {
			cb.chatNotice(prizeText,msg['user']);
		}
	}
	
	if (msg['user'] == high_tip_username)  {
		//msg['background'] = CONFIG_COLOR_FIRST_PLACE;
	}

	return msg;
});

cb.tipOptions(function(user) {
    return;
});


function handleTip(tip,user) {

	// track top tipper
	trackTips(user,tip);

	if (boardNumbers.indexOf(tip) > -1) {
		drawNumberCalled(tip,user);	
		updateSubject();
		cb.chatNotice(getAdvert());
	} else {
		if (cb.settings.multitip == 'yes') {
			var next = getNextBestNumber(tip);
			tip = tip - next;
			var haveNext = false;
			if (next > 0) haveNext = true;

			while (boardNumbers.indexOf(next) > -1) {
				drawNumberCalled(next,user);
				next = getNextBestNumber(tip);
				tip = tip - next;
			}
			if (haveNext) {
				updateSubject();
				cb.chatNotice(getAdvert());
			}
		}
	}
}




//helper functions
function updateSubject() {
	var newSubject = description + ' Uncover prizes by tipping the numbers on the board. Clear the board to reach goal! \nGoal is: [' + cb.settings.goal_description + ']\nType ' + COMMAND_BOARD_STATUS + ' to see the board. Type ' + COMMAND_PRIZES + ' to see available prizes.';
	cb.log("Changing subject to: " + newSubject);
	cb.changeRoomSubject(newSubject);
}
function getAdvert() {
	var advert = 'Type '+COMMAND_BOARD_STATUS+' to see the board. Type '+COMMAND_PRIZES+' to see prizes remaining.';
	if (cb.settings.multitip == 'yes') advert += ' Big tips clear multiple numbers!';
	return advert;
}
function getTipCount() {
	var count = 0;
	for (var i=0;i<boardNumbers.length;i++) {
		count += boardNumbers[i];
	}
	return count;
}

function formatUsername(val) {
    if (!val || val=='undefined') {
        return "--";
    } else {
        return val.substring(0, 12);
    }
}
function trackTips(user,tip) {
	if (user in userTipTotals)  {
		userTipTotals[user] = userTipTotals[user] + tip;
	} else {
		userTipTotals[user] = tip;
	}
	var usertips = userTipTotals[user];
	
	if (usertips > high_tip_amount) {
		high_tip_amount = usertips;
		high_tip_username = user;
	}
}
function drawNumberCalled(n,user) {
	var out = '-- Number called [ '+n+' ]\n';
	if (boardNumbers.indexOf(n) > -1) {
		boardNumbers.splice(boardNumbers.indexOf(n),1);
		if (n in boardPrizes) {
			out += '********** WINNER!!   - Prize won: ' + boardPrizes[n];
			userPrizes.push({prize:boardPrizes[n],user:user});
			delete boardPrizes[n];
		} else {
			out += '-------- No prize won, try again';
		}
	}
	cb.chatNotice(out);
}
function drawBoard() {
	var out = 'Token Board\n';
	out += nl + '\n';
	if (tipsRemaining() < 1) {
		out += '***********  Board Cleared!!! ***********\nGoal met:  ' + cb.settings.goal_description + '\n';
	} else {
		var mod = 10;
		var col = 1;
		if (cb.settings.boardnumbermax - cb.settings.boardnumbermin > 100) mod = 20;
		for (var i=cb.settings.boardnumbermin; i <= cb.settings.boardnumbermax; i++) {
			out += ' ';
			if (boardNumbers.indexOf(i) > -1) out += pad(i,2);
			else out += 'xx';
			out += ' ';
		    if (col == mod) {
		    	out += '\n';
		    	col = 1;
		    } else {
			    col++;
		    }
		}
	}
	if (out.substring(out.length-1) != '\n') out += '\n';
	out += nl;
	cb.chatNotice(out);	
}
function drawPrizes(user) {
	var out = nl + '\nPrizes on the board:\n';
	for (key in boardPrizes) {
		if (boardPrizes.hasOwnProperty(key)) out += ' **    ' + boardPrizes[key] + '\n';
	}
	out += 'Prizes won:\n';
	for (var i=0; i < userPrizes.length; i++) {
		out += ' **    ' + userPrizes[i].prize + ' [won by ' + userPrizes[i].user + ']\n';
	}
	out += nl;
	return out;
}

function getNextBestNumber(tip) {
	var num = 0;
	for (var i=0;i<boardNumbers.length;i++) {
		if (boardNumbers[i] <= tip) {
			num = boardNumbers[i];
		}
	}
	return num;
}


function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}
function tipsRemaining() {
	return boardNumbers.length;
}
function prizesRemaining() {
	var count = 0;
	for (var k in boardPrizes) {
		if (boardPrizes.hasOwnProperty(k)) {	
			count++;
		}
	}
	return count;
}
/**
 * Returns a random integer between min and max
 */
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setupBoard() {
	// need to load prizes
	var temp = new Array(cb.settings.prize1,cb.settings.prize2,cb.settings.prize3,cb.settings.prize4,cb.settings.prize5,cb.settings.prize6,cb.settings.prize7,cb.settings.prize8,cb.settings.prize9,cb.settings.prize10,cb.settings.prize11,cb.settings.prize12,cb.settings.prize13,cb.settings.prize14,cb.settings.prize15);
	var tempslots = new Array(cb.settings.prize1num,cb.settings.prize2num,cb.settings.prize3num,cb.settings.prize4num,cb.settings.prize5num,cb.settings.prize6num,cb.settings.prize7num,cb.settings.prize8num,cb.settings.prize9num,cb.settings.prize10num,cb.settings.prize11num,cb.settings.prize12num,cb.settings.prize13num,cb.settings.prize14num,cb.settings.prize15num);
	
	for (var i = 0; i<temp.length; i++) {
		if (temp[i] != '') {
			for (var k = cb.settings.boardnumbermin-1; k<cb.settings.boardnumbermax; k++) {
				if (tempslots[i] != '' && tempslots[i] >= cb.settings.boardnumbermin && tempslots[i] <= cb.settings.boardnumbermax) {
					boardPrizes[tempslots[i]] = temp[i].replace(/[^a-zA-Z 0-9]+/g,'');
					break;
				} else {
					if (tempslots[i] < cb.settings.boardnumbermin || tempslots[i] > cb.settings.boardnumbermax) cb.chatNotice('WARNING: Board num specified for a prize does not exist. Randomly placing...');
					randomNum = getRandomInt(cb.settings.boardnumbermin,cb.settings.boardnumbermax);
					if (!(randomNum in boardPrizes) && !(randomNum in tempslots)) {
						boardPrizes[randomNum] = temp[i].replace(/[^a-zA-Z 0-9]+/g,'');
						break;
					}
				}
			}
		}
	}
	// load the board
	for (var j = cb.settings.boardnumbermin; j<=cb.settings.boardnumbermax; j++) {
		boardNumbers.push(j);
	}
}

function advert() {
    cb.chatNotice('Token Keno Is ACTIVE! Tip a number on the board to play! Type '+COMMAND_BOARD_STATUS+' to see the board. Type '+COMMAND_PRIZES+' to see prizes remaining.');
    cb.setTimeout(advert, (CONFIG_ADVERT_MINUTES * 60000));
}

function init() {
	if (cb.settings.boardnumbermin <= cb.settings.boardnumbermax) {
		setupBoard();
		updateSubject();
		drawBoard();
		cb.drawPanel();
		cb.setTimeout(advert, (CONFIG_ADVERT_MINUTES * 60000));
	} else {
		cb.chatNotice('ERROR: Min number can\'t be bigger than max, restart the app');
	}
	
}

init();

