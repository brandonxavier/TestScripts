/*************************************************************
  TITLE:  RinseNRepeat
  AUTHOR: KellyNumberFan
  Version: 2.03
  DATE:   2013-02-17
  THANKS: KellyNumber, Elisadeathnaked, Texas_Blonde, CollegeCouple69, MaryXXXJane, JackGellar, Lance2000 and Shr3k giving me the idea, feedback and testing the application.
  DESCRIPTION: We have noticed with most applications tips seem to stall as amounts grow. This applications goal is to keep tips flowing for the broadcasters.

This application allows a Tip Sequence From 1 To 10, which generates 55 tokens (Mini-Goal). This Tip sequence can be repeated 2000 times (110,000 tokens).  Once the Repeat Sequence has been reached the Main Goal is performed.

CHANGES: v1.01 Added /restart for broadcasters to start the application again.
                  wording changes.
                 Token Count down broadcasted in chat and subject bar.
		 v2.00 Rewritten to use choice for repeating sequence and tokens
		       Fixed issue with large token tip amounts
			   Removed alot of room spam.
                     v2.01 changed notice for room token goal to be broadcasted to all
					 
		v2.01 Added /restart command
		
		v2.02 Removed some room spam
			  Added /help command
		            /setmini command - to change the mini goal; Allow broadcastors or mods to change mini & main goals
					/setmain command - to change the main goal;
		
		v2.03 Fixed goal spam
		      
	Example Repeating Sequence and Tokens generated:
        Every Sequence (1 to 10) = 55 Tokens

	Sequence             Sequence             Sequence
	Repeat   Tokens      Repeat   Tokens      Repeat   Tokens
	---------------------------------------------------------
	1	     55          11	      605         21	   1155
	2	     110         12	      660         22  	   1210
	3	     165         13	      715         23	   1265
	4	     220         14	      770         24	   1320
	5	     275         15	      825         25	   1375
	6 	     330         16	      880         26	   1430
	7     	 385         17	      935         27	   1485
	8	     440         18	      990         28	   1540
	9	     495         19	      1045        29	   1595
	10	     550         20	      1100        30	   1650
	---------------------------------------------------------
	31	     1705        41	     2255		 100	   5500
	32	     1760        42	     2310        200      11000 
 	33	     1815        43	     2365        300      16500
	34	     1870        44	     2420        400      22000   
	35	     1925        45	     2475        500      27500
	36	     1980        46	     2530        600      33000
	37	     2035        47	     2585        700      38500
	38	     2090        48	     2640        800      44000
	39	     2145        49	     2695        900      49500
	40	     2200        50	     2750       1000      55000
	--------------------------------------------------------
**************************************************************/
var next_tip_amount = null;
var last_username = null;
var max_tip_sequence = null;
var goal_reached = false;
var mini_goal_count = null;
var total_goal_tokens = null;
var show_goal_reached_msg = null;

var minigoaldescr = null;
var maingoaldescr = null;

// Limit goal description as we add some text
cb.settings_choices = [
    { name: 'goal_descr',  type: 'str', minLength: 1, maxLength: 190, label:"Goal Description (Orgasm/Shower/Oil Shows etc...)" },
	{ name: 'mini_goal_descr', type: 'str', minLength: 1, maxLength: 190, label:"Mini Goal Description (Flash Feet/Breasts/Ass/Vagina etc...)" },
	{ name: 'goal_sequence', type:'choice',
			 choice1: '1 - 55 tokens', choice2: '2 - 110 tokens',  choice3: '3 - 165 tokens',
			 choice4: '4 - 220 tokens', choice5: '5 - 275 tokens',  choice6: '6 - 330 tokens',
			 choice7: '7 - 385 tokens', choice8: '8 - 440 tokens',  choice9: '9 - 495 tokens',
			 choice10: '10 - 550 tokens', choice11: '11 - 605 tokens',  choice12: '12 - 660 tokens',
			 choice13: '13 - 715 tokens', choice14: '14 - 770 tokens',  choice15: '15 - 825 tokens',
			 choice16: '16 - 880 tokens', choice17: '17 - 935 tokens',  choice18: '18 - 990 tokens',
			 choice19: '19 - 1045 tokens', choice20: '20 - 1100 tokens',  choice21: '21 - 1155 tokens',
			 choice22: '22 - 1210 tokens', choice23: '23 - 1265 tokens',  choice24: '24 - 1320 tokens',
			 choice25: '25 - 1375 tokens', choice26: '26 - 1430 tokens',  choice27: '27 - 1485 tokens',
			 choice28: '28 - 1540 tokens', choice29: '29 - 1595 tokens',  choice30: '30 - 1650 tokens',
			 choice31: '35 - 1925 tokens',
			 choice32: '40 - 2200 tokens', choice33: '50 - 2750 tokens',  choice34: '60 - 3300 tokens',
			 choice35: '70 - 3850 tokens', choice36: '80 - 4400 tokens',  choice37: '90 - 4950 tokens',
			 choice38: '100 - 5500 tokens', choice39: '150 - 8250 tokens',
			 choice40: '200 - 11000 tokens', choice41: '250 - 13750 tokens',
			 choice42: '300 - 16500 tokens', choice43: '350 - 19250 tokens',
			 choice44: '400 - 22000 tokens', choice45: '500 - 27500 tokens',  choice46: '600 - 33000 tokens',
			 choice47: '700 - 38500 tokens', choice48: '800 - 44000 tokens',  choice49: '900 - 49500 tokens',
			 choice50: '1000 - 55000 tokens', choice51: '1250 - 68750 tokens',  choice52: '1500 - 82500 tokens',
			 choice53: '1750 - 96250 tokens', choice54: '2000 - 110000 tokens',
			 defaultValue:'16 - 880 tokens', label: "# Mini Goals - Total Goal Tokens"
	}	
];

cb.onTip(
    function (tip) {
        			
		// don't spam room with notice after goal has been reached.
		if (!goal_reached)
		{					
			// show last tipper
			var tipAmt = tip['amount'];
			last_username = tip['from_user'];
		
			total_goal_tokens -= tipAmt;
		
			if (total_goal_tokens < 0)
				{
				total_goal_tokens = 0;
				goal_reached = true;
				}
				
			while (tipAmt > 0 && !goal_reached)
			{
				if (tipAmt >= next_tip_amount)
				   {				   
				   next_tip_amount++;
				   }
				
				// subtract last tip amount from TipAmt
				tipAmt -= (next_tip_amount - 1);
			
				if (next_tip_amount > 10)
					{
						mini_goal_count++;
						
						// broadcast to room and performer mini goal
						cb.chatNotice("Mini Goal was reached for " + minigoaldescr + ". Full Screen Mode Suggested, No Typing Required, Enjoy the Show!!");
						cb.chatNotice("Mini Goal was reached " + mini_goal_count + " times out of " + max_tip_sequence + " times.", cb.room_slug);

						// Goal Reached?
						if ((mini_goal_count >= max_tip_sequence) || (total_goal_tokens <= 0))
						{
							goal_reached = true;
							break;
						}
						
						// reset the sequence
						next_tip_amount = 1;
					}
			}	
		}
		
		change_room_subject();
		cb.drawPanel();
    }
);

cb.onDrawPanel(
    function (user)
	{
        if (goal_reached)
		{
			show_goal_reached_msg = false;
		
			return {
				'template': '3_rows_11_21_31',
				'row1_value': '*** GOAL ***',
				'row2_value': 'THANK YOU TIPPERS',
				'row3_value': 'FULL Screen Mode Suggested'
			};
        }
		
		return {
        'template': '3_rows_of_labels',
        'row1_label': 'Next Tip Needed:',
        'row1_value': next_tip_amount,
        'row2_label': 'Last Tip From:',
        'row2_value': last_username,
        'row3_label': 'Tip In Order:',
        'row3_value': 'From 1 to 10'
		};
    }
);

function change_room_subject()
{
   var subject = "";

   if (goal_reached) 
	{
       subject = maingoaldescr + " [Goal reached! Thank you all Tippers.]";
	   
	   // broadcast to room and performer goal!
	   if (show_goal_reached_msg == true)
	      cb.chatNotice("Goal was reached for " + maingoaldescr);
    }
    else
	{
	   subject = minigoaldescr + " [Tip In Order From 1 to 10]. [Next Tip Amount: " + next_tip_amount + "]" + " Goal: " + maingoaldescr + " Tokens To Goal:[" + total_goal_tokens + "]";      
  	   cb.chatNotice("Next Tip Amount: " + next_tip_amount);   
	   cb.chatNotice("Remaining Goal Tokens: " + total_goal_tokens);	
	}

   cb.changeRoomSubject(subject);
}

cb.onMessage(function (msg)
	{
		// only parse cb.room_slug or is_mod messages
		if ((msg['user'] == cb.room_slug) || (msg['is_mod'] == true))
		{
			if (msg['m'] == '/help')
			{
			    msg['X-Spam'] = true;
				cb.chatNotice('***** Commands ******', msg['user']);
			    cb.chatNotice(' ** Broadcastors ** ', msg['user']);
				cb.chatNotice(' ** /restart - used to restart the application.', msg['user']);
				cb.chatNotice(' ** /setmain - used to change the main goal.', msg['user']);
				cb.chatNotice(' ** Broadcastor and Moderators ** ', msg['user']);
				cb.chatNotice(' ** /setmini - used to change the mini goal.', msg['user']);
				return msg;
			}
		
			// only slug can restart application
			if ((msg['m'] == '/restart') && (msg['user'] == cb.room_slug))
			{
			 msg['X-Spam'] = true;
			 cb.chatNotice("-----------------------");
			 cb.chatNotice("Restarting Application");
			 cb.chatNotice("-----------------------");
			 init();
			 cb.drawPanel();
			 return msg;
			}
			
			// change the mini goal
			if (msg['m'].indexOf("/setmini") >= 0)
			{
			 msg['X-Spam'] = true;
			 minigoaldescr = msg['m'].replace("/setmini","");
			 change_room_subject();
			 return msg;
			}
			
			// change the main goal
			if (msg['m'].indexOf("/setmain") >= 0)
			{
			 msg['X-Spam'] = true;
			 maingoaldescr = msg['m'].replace("/setmain","");
			 change_room_subject();
			 return msg;
			}
		}
	
	return msg;
});

// Initialize Application
function init() 
	{
	cb.chatNotice("-----------------------------------------");
	cb.chatNotice("--- Developed By: KellyNumberFan -- v2.03");
	cb.chatNotice("--- TYVM Everyone for testing and providing feedback!!!");
	cb.chatNotice("--- KellyNumber, Elisadeathnaked, Texas_Blonde, CollegeCouple69");
	cb.chatNotice("--- MaryXXXJane, JackGellar, Lance2000 and Shr3k!!");
	cb.chatNotice("-----------------------------------------");
	
	next_tip_amount = 1;

	// Calculate the Tip Sequence and set Ascending Order
	// I know bad code/assumption. split() throws an error
	//var grp = cb.settings.goal_sequence.split('-');
	max_tip_sequence = parseInt(cb.settings.goal_sequence);
	
	minigoaldescr = cb.settings.mini_goal_descr;
	maingoaldescr = cb.settings.goal_descr;
	
	goal_reached = false;
	mini_goal_count = 0;
	last_username = "--";
	show_goal_reached_msg = true;
	
	total_goal_tokens = max_tip_sequence * 55;
	
	// Update the Subject with tip and goal
	cb.setTimeout(change_room_subject, 3000);
}

if (!!AppDevKit == false )
	init();