/* Module for handling triggers on a socket. */

var TriggerHappy = function(o) {
	
	var host = Config.host;
	var port = Config.port;
	var G = user.pref.sitelist, P = user.pref.profiles, g, p, gTriggers = [], pTriggers = [];
	var triggers;
	
	var init = function() {

		if (Config.notriggers) 
			return Config.socket.echo('Triggers disabled by official code.');
		
		for (g in G) {
			if (G[g].host == host) {
				gTriggers = G[g].triggers;
				break;
			}
		}
		
		if (P[param('profile')])
			pTriggers = P[param('profile')].triggers;
		
		triggers = [];
		
		if (gTriggers)
			for (var n = 0; n < gTriggers.length; n++)
				if (gTriggers[n][2])
					triggers.push(gTriggers[n]);

		if (pTriggers)
			for (var n = 0; n < pTriggers.length; n++)
				if (pTriggers[n][2])
					triggers.push(pTriggers[n]);
		
		for (var t = 0; t < triggers.length; t++) {
			try {
				triggers[t][3] = new RegExp(triggers[t][0].replace(/\$[0-9]/g, '([A-Za-z0-9\-\'\"]+)'), 'g');
			} catch(ex) {
				log(ex);
			}
		}
		
		Config.socket.echo('Loaded ' + triggers.length + '/' + (gTriggers.length + pTriggers.length) + ' triggers.');
	}
	
	var respond = function(msg) {

		if (Config.notriggers)
			return msg;
		
		for (var t = 0; t < triggers.length; t++) {
			
			var res = triggers[t][3].exec(msg);
			
			if (!res || !res.length)
				continue;

			var cmd = triggers[t][1];
			
			if (res.length > 1) {
				for (var n = 1; n < res.length; n++)
					cmd = cmd.replace('$'+n, res[n], 'g');
			}
			
			Config.socket.send(cmd);
		}
		
		return msg;
	}
	
	init();
	
	return {
		init: init,
		respond: respond
	}
}