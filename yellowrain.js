/***********************************************
 Title: YellowRain
 Developer: KellyNumberFan, JackGellar, Lance2000, Riteof
 Thanks: KellyNumber, Elisadeathnaked and Texas_blonde for testing the application
 Description: Rain a yellow (or any other color) wall from a user's tip.
              For color codes please see: http://en.wikipedia.org/wiki/Web_colors
***********************************************/
var goal_reached = false;
var last_tip_username = '';
var highest_tipper_user = '';
var highest_tip_amount = 0;
var second_highest_user = '';
var second_highest_tip_amount = 0;
var last_tip_amount = 0;
var goal_value = 0;
var total_tips = 0;

// Limit goal description as we add some text
cb.settings_choices = [
    { name: 'goal_description', type: 'str', minLength: 1, maxLength: 190, label:"Goal Description:" },
    { name: 'goal_tokens',       type: 'int', minValue:  1, maxValue:  500500, default: 1000, label:"Token Goal:" },
	{ name: 'wall_color',       type: 'str', minLength:  1, maxLength:  7, default: '#FFFF00', label:"Wall Color:" }
];


function change_room_subject()
{
   var subject = "";

   if (goal_reached)
   {
      subject = "*** G O A L **** " + cb.settings.goal_description;
	}
   else
   {
      subject = "Keep Tipping for: " + cb.settings.goal_description;
    }
	
   cb.changeRoomSubject(subject);
}

cb.onTip(
    function(tip) 
	{
        var diff = tip['amount'];
		var tipfromuser = tip['from_user'];
		
		// determine highest tipper
		if (diff > highest_tip_amount)
		{
			// Move the current highest tipper to 2nd highest.
			// No reason to show the person twice.
			if (highest_tipper_user != tipfromuser)
			{
				second_highest_tip_amount = highest_tip_amount;
				second_highest_user = highest_tipper_user;
			}
			
			highest_tip_amount = diff;
			highest_tipper_user = tipfromuser;
		}
		else
		{
			if ((second_highest_tip_amount == 0) || (diff > second_highest_tip_amount))
			{
				second_highest_tip_amount = diff;
				second_highest_user = tipfromuser;
			}
		}
		
		last_tip_amount = diff;
		last_tip_username = tipfromuser;
		
		total_tips += diff;
		
        while ((diff > 0) && (!CheckGoal()))
		{
			//cb.chatNotice(last_tip_username + ' tipped 1 tokens', cb.room_slug);
			cb.chatNotice(last_tip_username + ' tipped 1 tokens');
            diff -= 1;
        }

        change_room_subject();
        cb.drawPanel();
    }
);

cb.onMessage(function (msg) {
	if (msg['user'] == highest_tipper_user)
	{
	    msg['background'] = cb.settings.wall_color;
	}	
    return msg;
});

function CheckGoal()
{
	if (total_tips >= goal_value)
		{
		goal_reached = true;
		return true;
		}
		
	return false;
}

// Initialize Application
function init() 
	{
	cb.chatNotice("***********************************************");
	cb.chatNotice("Developer: KellyNumberFan, JackGellar, Lance2000 and Riteof");
	cb.chatNotice("Version 1.0");
	cb.chatNotice("Thanks For Testing:");
	cb.chatNotice("KellyNumber, Elisadeathnaked and Texas_Blonde!!");
	cb.chatNotice("***********************************************");

	goal_reached = false;
	goal_value = cb.settings.goal_tokens;
	total_tips = 0;
	highest_tip_amount = 0;
	second_highest_tip_amount = 0;
	last_tip_username = "No Tipper";
	highest_tipper_user = "No Tipper";
	second_highest_user = "No Tipper";
	
	// Update the Subject with tip and goal
    change_room_subject();
}

if(!!AppDevKit == false)
	init();