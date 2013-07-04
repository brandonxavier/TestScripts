/*
	Name:	Multi-Goal
	Author:	mx2k6

	Version History
	============================================
	v1.0 08/02/2013: First release
	v1.1 22/02/2013: Added /stats and /reset commands.  See Description for more
	v1.2 08/03/2013: Added /skip (thanks to jcummings for that)
	v1.3 12/03/2013: Added /goals command for moderators and /upnext command for broadcasters.  See Description for more
	v1.4 13/03/2013: Minor cleanup to make code more readable.  Modified /upnext to actually use the broadcaster's message instead of chat notice
	v1.5 07/04/2013: Added some debugging code so I can get to the bottom of why chat commands don't always respond
	v1.6 13/04/2013: Fixed an embarrassing bug where all broadcaster and debug commands were ignored
	v1.7 20/04/2013: Tipper leaderboard now available on /stats output - see who your top 10 tippers are
	v1.8 21/04/2013: Goal timer function now available - /timer x now sets a countdown to when the goal needs tp be in by
	v1.9 05/05/2013: Stats junkies rejoice!  /stats will now display an approximate token count per minute, to help you work out whether you'll make more tokens camming or flipping burgers.  Also, tip goal king now stands out more!
	v1.10 05/05/2013: Now optionally highlight your highest total tipper (light purple currently - make suggestions people!) so the one who contributes the most can show off too!
	v1.11 05/05/2013: Timer stability improvements.  Added timer debugging code.  Type '/verbose' (broadcaster ONLY) to get precise dates and times of timer interval for when requesting support
	v1.12 18/05/2013: Clarified stats text relating to per minute figures.  Changed highest tipper to no longer have a green "fanclub" name until such time as we can change the colour to a custom one
	v1.13 31/05/2013: Added ability for high tippers to "opt out" of being highlighted by typing "/donotwant" after they tip
	v1.14 05/06/2013: Added ability to directly manipulate tokens toward goals with /addtokens and /removetokens.  See /help for more

	Credits and Props
	============================================
	Based on the bog standard tip goal app, with multiple goals, tip goal king, and generally less suckiness.

*/

// vars
var actual_total_tipped = 0;
var total_tipped = 0;
var current_total_tipped = 0;

var high_tip_username = null;
var high_tip_amount = 0;

var high_total_username = null;
var high_total_amount = 0;

var low_tip_username = null;
var low_tip_amount = 0;

var last_tip_username = null;
var last_tip_amount = 0;

var high_tip_highlight_optout = false;
var high_total_highlight_optout = false;

var all_tippers = [];

var subject_is_final = false;

var current_goal = 1;
var final_goal_met = false;

var startup_time = null;
var spit_verbose_output = false;

cb.settings_choices = [
	{name: 'goal_1_tokens', label: 'Goal 1 Token Amount', type: 'int', minValue: 1, defaultValue: 200},
	{name: 'goal_1_description', label: 'Goal 1 Description', type: 'str', minLength: 1, maxLength: 255},
	{name: 'goal_2_tokens', label: 'Goal 2 Token Amount', type: 'int', minValue: 1, defaultValue: 200, required: false},
	{name: 'goal_2_description', label: 'Goal 2 Description', type: 'str', minLength: 0, maxLength: 255, required: false},
	{name: 'goal_3_tokens', label: 'Goal 3 Token Amount', type: 'int', minValue: 1, defaultValue: 200, required: false},
	{name: 'goal_3_description', label: 'Goal 3 Description', type: 'str', minLength: 0, maxLength: 255, required: false},
	{name: 'goal_4_tokens', label: 'Goal 4 Token Amount', type: 'int', minValue: 1, defaultValue: 200, required: false},
	{name: 'goal_4_description', label: 'Goal 4 Description', type: 'str', minLength: 0, maxLength: 255, required: false},
	{name: 'goal_5_tokens', label: 'Goal 5 Token Amount', type: 'int', minValue: 1, defaultValue: 200, required: false},
	{name: 'goal_5_description', label: 'Goal 5 Description', type: 'str', minLength: 0, maxLength: 255, required: false},
	{name: 'finality_message', label: 'Final Goal Met Subject', type: 'str', minLength: 1, maxLength: 255, defaultValue: 'Goal reached!  Thanks to all tippers!'},
	{name: 'highlight_goal_king', label: 'Highlight highest tipper', type: 'choice', choice1: 'Yes', choice2: 'No', defaultValue: 'Yes'},
	{name: 'highlight_total_king', label: 'Highlight highest total tipper', type: 'choice', choice1: 'Yes', choice2: 'No', defaultValue: 'No'},
	{name: 'show_timer_in_subject', label: 'Add time remaining to subject if running?', type: 'choice', choice1: 'Yes', choice2: 'No', defaultValue: 'No'},
	{name: 'mod_allow_broadcaster_cmd', label: 'Allow mods to use broadcaster commands?', type: 'choice', choice1: 'Yes', choice2: 'No', defaultValue: 'No'}
];

function verboseMessage(message, user) {
	cb.log("Verbose debug message: " + message);
	if (spit_verbose_output) {
		cb.chatNotice("[Verbose] " + message, user);
	}
}

var goalTimer = {
	secondsDown: 60,
	timeRemaining: 0,
	timerRunning: false,
	timerReallyRunning: false,
	spamMessage: "Time's running out!  Only %time minutes left to tip to the goal!",
	timesUpMessage: "Time's Up!  Sorry, the goal didn't happen in time.",
	hookOnTimer: function() {

	},
	startTimer: function(minutes) {
		verboseMessage("Timer started at " + new Date().toString(), cb.room_slug);
		this.timeRemaining = minutes;
		this.timerRunning = true;
		this.timerReallyRunning = true;
		this.hookOnTimer();
		this.announce();
		cb.setTimeout(function() { goalTimer.onTimer(); }, 60000);
	},
	stopTimer: function() {
		verboseMessage("Timer stopped at " + new Date().toString(), cb.room_slug);
		this.timerRunning = false;
		this.hookOnTimer();
	},
	onTimer: function() {
		this.timerReallyRunning = false;
		if (this.timerRunning) {
			verboseMessage("Timer interval reached at " + new Date().toString(), cb.room_slug);
			this.timeRemaining--;
			this.hookOnTimer();
			this.announce();
			if (this.timeRemaining === 0) {
				verboseMessage("Timer expired at " + new Date().toString(), cb.room_slug);
				this.timerRunning = false;
			} else {
				this.timerReallyRunning = true;
				cb.setTimeout(function() { goalTimer.onTimer(); }, 60000);
			}
		}
	},
	getExtraText: function() {
		if (this.timerRunning) {
			return this.timeRemaining + " min left";
		} else {
			return "";
		}
	},
	announce: function() {
		if (this.timeRemaining > 0 && cb.settings.show_timer_in_subject !== "Yes" ) {
			cb.chatNotice(this.spamMessage.replace("%time", this.timeRemaining));
		} else if ( this.timeRemaining === 0 ) {
			cb.chatNotice(this.timesUpMessage);
		}
	}
};

function getCurrentGoalDescription() {
	return cb.settings['goal_' + current_goal + '_description'];
}

function getPreviousGoalAmount() {
	return cb.settings['goal_' + ( current_goal - 1 ) + '_tokens'];
}

function getCurrentGoalAmount() {
	return cb.settings['goal_' + current_goal + '_tokens'];
}

function getSumTotalGoal() {
	var total_goal = 0; var i = 1;
	for (i = 1; i <= 5; i++) {
		if (cb.settings['goal_' + i + '_description'] !== "" && cb.settings['goal_' + i + '_tokens'] !== 0 ) {
			total_goal += cb.settings['goal_' + i + '_tokens'];
		}
	}
	return total_goal;
}

function getAllGoals() {
	var all_goals = "";
	for (i = 1; i <= 5; i++) {
		if (cb.settings['goal_' + i + '_description'] !== "" && cb.settings['goal_' + i + '_tokens'] !== 0 ) {
			all_goals += cb.settings['goal_' + i + '_description'] + ' (' +  cb.settings['goal_' + i + '_tokens']  + ' tokens)\n';
		}
	}
	all_goals += "- All Goals: " + getSumTotalGoal();
	return all_goals;
}

function getLeaderBoard() {
	var leaderboard = "";
	for (var idx = 0; idx < all_tippers.length && idx < 10; idx++) {
		if (all_tippers[idx] !== undefined) {
			leaderboard += all_tippers[idx].name + ' (' + all_tippers[idx].tokens + ')\n';
		}
	}
	return leaderboard;
}

function getTokensPerMinute() {
	var now = new Date();
	var timespan = now - time_started;

	var tokens_per_min = ((Math.round(actual_total_tipped * 10) / 10) / (Math.round(timespan / 1000 / 60 * 10) / 10));
	return (Math.round(tokens_per_min * 10) / 10);
}

function getDollarsPerMinute() {
	return (0.05 * Math.floor(getTokensPerMinute())).toFixed(2);
}

function skipGoal() {
	current_goal++;
	checkFinality();
	update_goals();
}

function getNextGoalAnnouncement() {
	return tips_remaining() + " tokens to next goal: " + cb.settings['goal_' + ( current_goal + 1 ) + '_description'];
}

function checkFinality() {
	if (getCurrentGoalAmount() <= 0 || getCurrentGoalDescription() === "" || current_goal === 6) {
		final_goal_met = true;
	} else {
		final_goal_met = false;
	}
}

function tips_remaining() {
	var r = getCurrentGoalAmount() - current_total_tipped;
	return (r < 0) ? 0 : r;
}

function format_username(val) {
	return (val === null) ? "--" : val.substring(0, 12);
}

function update_goals() {
	var new_subject = "";
	if (subject_is_final && final_goal_met) {
		return;
	}
	if (final_goal_met) {
		cb.log("Final goal met - notifying broadcaster and setting finality");
		cb.chatNotice("Your final goal has been met!  You can type '/reset' to start again from zero.", cb.room_slug);
		new_subject = cb.settings.finality_message;
		subject_is_final = true;
	} else {
		new_subject = getCurrentGoalDescription() + " [" + tips_remaining() + " tokens remaining]";
		if (cb.settings.show_timer_in_subject === "Yes" && goalTimer.timerRunning) {
			new_subject += " (" + goalTimer.getExtraText() + ")";
		}
		subject_is_final = false;
	}
	cb.log("Changing subject to: " + new_subject);
	cb.changeRoomSubject(new_subject);
}

function recordTip(username, tokens, record_actual) {
	var tipper_found = false;

	total_tipped += tokens;
	current_total_tipped += tokens;
	if ( record_actual ) actual_total_tipped += tokens;

	while (current_total_tipped >= getCurrentGoalAmount()) {
		cb.log("Total tipped has exceeded current goal - incrementing step");
		current_total_tipped = current_total_tipped - getCurrentGoalAmount();
		cb.chatNotice("* Goal met: " + getCurrentGoalDescription(), cb.room_slug);
		current_goal++;
		checkFinality();
	}
	while (current_total_tipped < 0) {
		cb.log("Total subtracted has gone below zero [" + current_total_tipped + "] - decrementing step");
		current_total_tipped = current_total_tipped + getPreviousGoalAmount();
		current_goal--;
		cb.chatNotice("* Goal unmet: " + getCurrentGoalDescription(), cb.room_slug);
		checkFinality();
	}

	last_tip_amount = tokens;
	last_tip_username = username;
	if (tokens > high_tip_amount) {
		if ( high_tip_username !== username ) {
			cb.chatNotice("You are now the highest tipper.  If you do not want your name highlighted in chat, simply type the command '/donotwant' (without quotes) now", username);
		}
		high_tip_amount = tokens;
		high_tip_username = username;
		high_tip_highlight_optout = false;
	}
	if (tokens <= low_tip_amount || low_tip_amount == 0) {
		low_tip_amount = tokens;
		low_tip_username = username;
	}

	for (var idx = 0; idx < all_tippers.length; idx++) {
		if (all_tippers[idx].name == username) {
			tipper_found = true;
			all_tippers[idx].tokens += tokens;
			break;
		}
	}
	if (!tipper_found) {
		all_tippers.push({ name: username, tokens: tokens });
	}
	all_tippers.sort(function (a, b) {
		return b.tokens - a.tokens;
	});

	if ( high_total_username !== all_tippers[0].name ) {
		cb.chatNotice("You are now the highest total tipper.  If you do not want your name highlighted in chat, simply type the command '/donotwant' (without quotes) now", all_tippers[0].name);
	}

	high_total_username = all_tippers[0].name;
	high_total_amount = all_tippers[0].tokens;
	high_total_highlight_optout = false;

	checkFinality();
	update_goals();
	cb.drawPanel();
}

function goalTimerOnTimer() {
	cb.drawPanel();
	if (cb.settings.show_timer_in_subject === "Yes") {
		update_goals();
	}
}

function reset() {
	cb.log("Resetting all goals");

	low_tip_amount = 0;
	high_tip_amount = 0;
	last_tip_amount = 0;
	high_total_amount = 0;
	low_tip_username = null;
	high_tip_username = null;
	last_tip_username = null;
	high_total_username = null;

	current_goal = 1;
	total_tipped = 0;
	current_total_tipped = 0;
	final_goal_met = false;

	all_tippers = [];

	cb.drawPanel();
	update_goals();
}

cb.onTip(function (tip) {
	recordTip(tip.from_user, tip.amount, true);
});


cb.onDrawPanel(function (user) {
	var panel = {};
	if (final_goal_met) {
		panel = {
			'template': '3_rows_of_labels',
			'row1_label': 'Total Tips:',
			'row1_value': total_tipped,
			'row2_label': 'Highest Tip:',
			'row2_value': format_username(high_tip_username) + ' (' + high_tip_amount + ')',
			'row3_label': 'Latest Tip Received:',
			'row3_value': format_username(last_tip_username) + ' (' + last_tip_amount + ')'
		};
	} else {
		panel = {
			'template': '3_rows_of_labels',
			'row1_label': 'Tip Received / Goal (Total):',
			'row1_value': current_total_tipped + ' / ' + getCurrentGoalAmount() + ' (' + total_tipped + ')',
			'row2_label': 'Highest Tip:',
			'row2_value': format_username(high_tip_username) + ' (' + high_tip_amount + ')',
			'row3_label': 'Latest Tip Received:',
			'row3_value': format_username(last_tip_username) + ' (' + last_tip_amount + ')'
		};

		if (goalTimer.timerRunning) {
			panel.row3_label = 'Time Remaining:';
			panel.row3_value = goalTimer.getExtraText();
		}
	}
	return panel;
});

cb.onMessage(function (msg) {
	var i = 0; var key = null;

	/* Tip king highlighting */
	if (cb.settings.highlight_goal_king === "Yes" && msg.user === high_tip_username && !high_tip_highlight_optout) {
		msg.background = '#9F9';
	}
	if (cb.settings.highlight_total_king === "Yes" && msg.user === high_total_username && !high_total_highlight_optout ) {
		msg.background = '#CCF';
	}

	var bc_only_text = " (broadcaster only)";
	if (cb.settings.mod_allow_broadcaster_cmd === "Yes") {
		bc_only_text = "";
	}

	/* If it starts with a /, suppress that shit and assume it's a command */
	if (msg.m.substring(0,1) === "/") {
		msg["X-Spam"] = true;
		if (msg.user === cb.room_slug || msg.is_mod) {
			/* Broadcaster or mod commands */
			if (msg.m.substring(1) === "stats") {
				cb.log("Stats command received from " + msg.user);
				cb.chatNotice("=== Total Stats ===", msg.user);
				cb.chatNotice("Sum total goal: " + getSumTotalGoal(), msg.user);
				cb.chatNotice("Total tipped so far: " + total_tipped, msg.user);
				cb.chatNotice("Total goal remaining: " + (getSumTotalGoal() - total_tipped), msg.user);
				cb.chatNotice("Tokens/min: " + getTokensPerMinute(), msg.user);
				cb.chatNotice("Disclaimer: per minute figures EXCLUDE private shows, group shows, and other non-tip token gains", msg.user);
				if (msg.user === cb.room_slug) {
					cb.chatNotice("=== Broadcaster Only Stats (mods cannot see this section) ===", msg.user);
					cb.chatNotice("Total actual tipped (disregarding resets): " + actual_total_tipped, msg.user);
					cb.chatNotice("Dollars/min (assuming $0.05/token): $" + getDollarsPerMinute(), msg.user);
				}
				cb.chatNotice("=== Tip Stats ===", msg.user);
				cb.chatNotice("Highest total tips: " + high_total_amount + " from " + high_total_username, msg.user);
				cb.chatNotice("Awesomest tip: " + high_tip_amount + " from " + high_tip_username, msg.user);
				cb.chatNotice("Stingiest tip: " + low_tip_amount + " from " + low_tip_username, msg.user);
				cb.chatNotice("Most recent tip: " + last_tip_amount + " from " + last_tip_username, msg.user);
				cb.chatNotice("=== Leaderboard (Top 10) ===", msg.user);
				cb.chatNotice(getLeaderBoard(), msg.user);
			} else if (msg.m.substring(1) === "goals") {
				cb.log("Goals command received from " + msg.user);
				cb.chatNotice("=== All Goals ===", msg.user);
				cb.chatNotice(getAllGoals(), msg.user);
			} else if (msg.m.substring(1) === "help") {
				cb.log("Help command received from " + msg.user);
				cb.chatNotice("=== Help ===", msg.user);
				cb.chatNotice("/stats - displays token statistics, including the sum total goal, amount so far, and misc information", msg.user);
				cb.chatNotice("/goals - displays all goals in in order", msg.user);
				cb.chatNotice("/upnext - announces the next goal to the room" + bc_only_text, msg.user);
				cb.chatNotice("/skip - skips the current goal, and moves onto the next one" + bc_only_text, msg.user);
				cb.chatNotice("/reset - resets goal status back to zero" + bc_only_text, msg.user);
				cb.chatNotice("/timer x - sets goal timer to x minutes" + bc_only_text, msg.user);
				cb.chatNotice("/timer stop - stops the running goal timer" + bc_only_text, msg.user);
				cb.chatNotice("/addtokens x - Adds an x token tip to the goal, incrementing if necessary (broadcaster only)", msg.user);
				cb.chatNotice("/removetokens x - Removes an x token tip from the goal, decrementing if necessary (broadcaster only)", msg.user);
			}
		}
		if (msg.user === cb.room_slug || (cb.settings.mod_allow_broadcaster_cmd === "Yes" && msg.is_mod)) {
			/* Broadcaster only commands, unless the option to allow mods to use them is enabled */
			if (msg.m.substring(1) === "reset") {
				cb.log("Reset command received from " + msg.user);
				reset();
			} else if (msg.m.substring(1) === "skip") {
				cb.log("Skip command received from " + msg.user);
				skipGoal();
			} else if (msg.m.substring(1) === "upnext") {
				cb.log("Upnext command received from " + msg.user);
				cb.chatNotice("* I ate your message.  Sorry about that.  But I did let the viewers know about the next goal!", msg.user);
				msg.m = getNextGoalAnnouncement();
				msg["X-Spam"] = false;
			} else if (msg.m.substring(1,6) === "timer") {
				cb.log("Timer command received from " + msg.user);
				if (msg.m.length >= 8) {
					var params = msg.m.substring(7);
					if (params === "stop") {
						goalTimer.stopTimer();
					} else {
						var timer = parseInt(params, 10);
						if (timer > 0 && timer <= 60) {
							if (!goalTimer.timerRunning) {
								if (!goalTimer.timerReallyRunning) {
									goalTimer.startTimer(timer);
									cb.chatNotice("Goal timer set to " + timer + " minutes.  Type '/timer stop' if you want to stop it early", msg.user);
								} else {
									cb.chatNotice("A previous stopped timer hasn't completed yet.  Please try again in a minute", msg.user);
								}
							} else {
								cb.chatNotice("A timer is already running.  Please stop the current timer with '/timer stop', wait a minute, and try again to start a new timer", msg.user);
							}
						} else {
							cb.chatNotice("You need to enter the number of minutes, in the form /timer <x> where <x> is a number from 1 to 60", msg.user);
						}
					}
				} else {
					cb.chatNotice("You need to enter the number of minutes, in the form /timer <x> where <x> is a number from 1 to 60", msg.user);
				}
			}
		}
		if (msg.user === cb.room_slug) {
			/* Broadcaster only commands at all times */
			if (msg.m.substring(1) === "verbose") {
				spit_verbose_output = !spit_verbose_output;
				cb.chatNotice("Verbose output is now " + (spit_verbose_output ? "enabled" : "disabled"), msg.user);
			} else if (msg.m.substring(1,10) === "addtokens") {
				var token_count = parseInt(msg.m.substring(11));
				if (token_count > 0) {
					cb.chatNotice("Adding " + token_count + " tokens against the token goal", msg.user);
					recordTip(msg.user, token_count, false);
				} else {
					cb.chatNotice("Error!  You must add at least 1 token", msg.user);
				}
			} else if (msg.m.substring(1,13) === "removetokens") {
				var token_count = parseInt(msg.m.substring(14));
				if (token_count > 0) {
					if (total_tipped - token_count >= 0) {
						cb.chatNotice("Removing " + token_count + " tokens from the token goal", msg.user);
						recordTip(msg.user, (token_count * -1), false);
					} else {
						cb.chatNotice("Error!  Tokens removed would result in negative total tipped");
					}
				} else {
					cb.chatNotice("Error!  You must remove at least 1 token", msg.user);
				}
			}
		}
		if (msg.user === "mx2k6") {
			/* Developer commands.  Debugging use only! */
			if (msg.m.substring(1) === "dumpsettings") {
				cb.chatNotice(cb.settings, msg.user);
			} else if (msg.m.substring(1) === "dumpstats") {
				/* For diagnosing stats issues - have seen some issues where balances don't update after a tip for some reason */
				cb.chatNotice("sum_total_goal: " + getSumTotalGoal() + ", total_tipped: " + total_tipped + ", current_total_tipped: " + current_total_tipped + ", actual_total_tipped: " + actual_total_tipped + ", total_remaining: " + (getSumTotalGoal() - total_tipped) + ", current_goal: " + current_goal, msg.user);
				cb.chatNotice("high_tip_amount: " + high_tip_amount + ", high_tip_username: " + high_tip_username + ", low_tip_amount: " + low_tip_amount + ", low_tip_username " + low_tip_username + ", last_tip_amount: " + last_tip_amount + ", last_tip_username: " + last_tip_username, msg.user);
				cb.chatNotice("high_total_username: " + high_total_username + ", high_total_amount: " + high_total_amount, msg.user);
				cb.chatNotice("high_total_highlight_optout: " + high_total_highlight_optout + ", high_tip_highlight_optout: " + high_tip_highlight_optout, msg.user);
				cb.chatNotice("time_started: " + time_started + ", getTokensPerMinute(): " + getTokensPerMinute() + ", getDollarsPerMinute(): " + getDollarsPerMinute(), msg.user);
				cb.chatNotice("getLeaderBoard() output:\n" + getLeaderBoard(), msg.user);
			}
		}

		/* Code to allow the highest tipper and total highest tipper to opt out of highlighting */
		if (msg.m.substring(1) === "donotwant") {
			cb.chatNotice("Your messages will no longer be highlighted.  Type '/dowant' without quotes to get it back again - if you're still on top!", msg.user);
			if (msg.user === high_tip_username) {
				high_tip_highlight_optout = true;
			}
			if (msg.user === high_total_username) {
				high_total_highlight_optout = true;
			}
		}
		/* Code to allow the highest tipper and total highest tipper to opt back into highlighting */
		if (msg.m.substring(1) === "dowant") {
			cb.chatNotice("Your messages will now be highlighted.  Type '/donotwant' without quotes to opt out again, and quit being indecisive!", msg.user);
			if (msg.user === high_tip_username) {
				high_tip_highlight_optout = false;
			}
			if (msg.user === high_total_username) {
				high_total_highlight_optout = false;
			}
		}		
	}

	/* Code to allow the developer to stand out if necessary (e.g. for tech support) */
	if (msg.user === "mx2k6" && msg.m.substring(0,1) === "#") {
		msg.in_fanclub = true;
		msg.m = msg.m.substring(1);
		msg.background = "#b1b3bc";
	}
	return msg;
});

function init() {
	goalTimer.hookOnTimer = function() { goalTimerOnTimer(); };
	time_started = new Date();

	cb.chatNotice("Tip Multi-Goal started.  Broadcasters and mods can type '/stats' for token stats, and '/help' for more commands.");
	update_goals();
}

if (!!AppDevKit == false)
init();
