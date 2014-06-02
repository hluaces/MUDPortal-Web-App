var ScrollView = function(o) {
	
	var self = this, ws = {}, sesslog = '', freeze, mobile = Config.device.mobile, touch = Config.device.touch;
	var cmds = [], cmdi = 0, echo = 1;
	var keepcom = (Config.getSetting('keepcom') == null || Config.getSetting('keepcom') == 1);
	
	var o = o||{
		scrollback: 20 * 1000
	};
	
	var id = '#scroll-view';
	
	o.local = (Config.getSetting('echo') == null || Config.getSetting('echo') == 1);	  
	o.echo = o.echo||1;
	
	var win = new Window({
		id: id,
		css: o.css,
		'class': 'nofade',
		max: 1,
		closeable: Config.ControlPanel
	});
	
	if (touch) {
		
	    j('#page').css({
	        background: 'none no-repeat fixed 0 0 #000000',
	        margin: '0px auto'
	    });
	    
	    j('body').css({
	        width: '100%',
	        height: '100%',
	        overflow: 'auto'
	    });

	    win.maximize();
	    
	    j(id).css({
	    	top: 0,
	    	left: 0
	    });
	}
	
	win.button({
		title: 'Increase the font size.',
		icon: 'icon-zoom-in',
		click: function(e) {
			var v = parseInt(j(id + ' .out').css('fontSize'));
			j(id + ' .out').css({
				fontSize: ++v + 'px',
				lineHeight: (v+5) + 'px'
			});
			j(id + ' .out').scrollTop(j(id + ' .out').prop('scrollHeight'));
			e.stopPropagation();
			return false;
		}
	});
	
	win.button({
		title: 'Decrease the font size.',
		icon: 'icon-zoom-out',
		click: function(e) {
			var v = parseInt(j(id + ' .out').css('fontSize'));
			j(id + ' .out').css({
				fontSize: --v + 'px',
				lineHeight: (v+5) + 'px'
			});
			j(id + ' .out').scrollTop(j(id + ' .out').prop('scrollHeight'));
			e.stopPropagation();
			return false;
		}
	});
	
	win.button({
		title: 'Download a session log.',
		icon: 'icon-download-alt',
		click: function(e) {
			var blob = new Blob(sesslog.split(), {type: "text/plain;charset=utf-8"});
			saveAs(blob, "log-"+Config.host+"-"+(new Date).ymd()+".txt");
			e.stopPropagation();
			return false;
		}
	});
	
	//if (Config.dev)
	win.button({
		title: 'Toggle a freezepane.',
		icon: 'icon-columns',
		click: function(e) {
			if (j(id + ' .freeze').length) {
				try {
					freeze.remove();
					j(id + ' .freeze').remove();
					j(id + ' .out').width('98%');
					j(id + ' .out').scrollTop(j(id + ' .out').prop('scrollHeight'));
				} catch(ex) { log(ex) }
			}
			else {
				j(id + ' .out').after('<div class="freeze">'+j(id + ' .out').html()+'</div>');
				j(id + ' .out').width('52%');
				freeze = j(id + ' .freeze').niceScroll({ 
					cursorwidth: 7,
					cursorborder: 'none'
				});
				j(id + ' .freeze').scrollTop(j(id + ' .freeze').prop('scrollHeight'));
				j(id + ' .out').scrollTop(j(id + ' .out').prop('scrollHeight'));
			}
			e.stopPropagation();
			return false;
		}
	});
	
	j(id + ' .content').append('\
		<div class="out nice"></div>\
		<div class="input" style="width: 97%;padding-right: 40px; position: absolute; bottom: 40px">\
			<input class="send" autocomplete="on" spellcheck="'+(Config.getSetting('spellcheck')?'true':'false')+'" title="Type a command in this field and press \'Enter\' to send it." placeholder="type your command..." aria-live="polite"/></div>\
	');
	
	if (mobile) {
		
		j(id + ' .out').css({
			'font-family': 'DejaVu Sans Mono',
			'font-size': '11px',
			height: '90%'
		});
		
		j(id + ' .input').css({ 
			//bottom: 32,
			position: 'fixed',
			width: '100%'
		});	
	}
	else {
		j(id + ' .input').append('<a class="kbutton multiline tip" title="Send multiline input." style="height: 16px !important; padding: 4px 8px !important; margin-left: 6px; position: relative; top: 3px;"><i class="icon-align-justify"></i></a>');
		
		var multi = function(e, text) {
			var modal = new Modal({
				title: 'Multiline Input',
				text: '<textarea class="multitext">'+(text||'')+'</textarea>',
				closeable: 1,
				buttons: [
				     {
				    	 text: 'Send',
				    	 click: function() {
				    		 var msg = j('.multitext').val().split('\n');
				    		 var ws = Config.Socket.getSocket();
				    		 for (var i = 0; i < msg.length; i++) {
				    			 var go = function(msg) {
				    				return function() {
				    				 	ws.send(msg + '\r\n');
				    				 	echo(msg);
				    					//cmds.push(msg);
				    					//cmdi = cmds.length;
				    			 	}
				    		 	 }(msg[i]);
				    			 setTimeout(go, 100 * (i+1));
				    		 }
				    	 }
				     },
				     {
				    	 text: 'Cancel'
				     }
				]
			});
			
			j('#modal').on('shown', function() {
				j('.multitext').focus();
				//j('#modal').resizable();
			});
			if (e)
				e.stopPropagation();
			return false;
		}
		
		j(id).on('click', '.multiline', multi);
		
		j(id + ' .send').autocomplete({
			appendTo: "body",
			minLength: 2,
		    source: function(request, response) {
		    	var c = cmds.filter(function (v, i, a) { return a.indexOf (v) == i }); 
		        var results = j.ui.autocomplete.filter(c, request.term);
		        response(results.slice(0, 5));
		    }
		});
	}
	
	j(id + ' .out').niceScroll({ 
		cursorwidth: 7,
		cursorborder: 'none'
	});
	
	j(document).on('mouseup', '.out, .freeze', function() {
		var t;
		if ((t = getSelText())) {
		
			if (t.match(/\n/) && Config.getSetting('automulti'))
				multi(null, t);
			else
				j(id + ' .send').val(j(id + ' .send').val()+t);
		}
		//else
			//j(id + ' .send').focus();
	});
	
	var scroll = function () { j(id + ' .out').scrollTop(j(id + ' .out').prop('scrollHeight')) };
	
	if (Config.device.touch) {	
		
		j(id + ' .send').focus(function() {
			//this.setSelectionRange(0, 9999);
			//j(this).val('');
			j(id).height('82%');
			scroll();
		});
		
		j(id + ' .send').blur(function() {
			/*if (j(this).val().length) {
				ws.send(j(this).val());
				j(this).val('');
			}
			else ws.send('\r\n');*/
			win.maximize();
			scroll();
		});
		
		document.addEventListener('touchstart', function(e) {
		    scroll();
		    //var touch = e.touches[0];
		    //alert(touch.pageX + " - " + touch.pageY);
		}, false);
		
		j(id + ' .send').keydown(function(e) {
			
			if (e.which == 13) { /* enter */
				
				e.preventDefault();
				
				if (j(this).val().length) {
					ws.send(j(this).val());
					j(this).val('');
				}
				else ws.send('\r\n');
			}
		});
		
		j(id + ' .send').focus();
		
		setInterval(scroll, 2000);
	}
	else {
		
		j(id + ' .send').focus(function() {
			if (!j(this).is(":focus"))
				j(this).select();
		});
		
		j(id + ' .send').focus().keydown(function(e) {
			
			if (e.which == 13) { /* enter */
				
				e.preventDefault();
				
				if (j(this).val().length) {
					var v = j(this).val();
					ws.send(v);
					cmds.push(v);
					cmdi++;
					//this.setSelectionRange(0, 9999);
					if (keepcom)
						this.select();
					else
						j(this).val('');
				}
				else ws.send('\r\n');
				
			}
			else if (e.keyCode == 38) { /* arrow up */
				
				e.preventDefault();
				
				if (cmdi)
					j(this).val(cmds[--cmdi]);
					
				this.select();
				//this.setSelectionRange(0, 9999);
			}
			else if (e.keyCode == 40) { /* arrow down */
				
				e.preventDefault();
				
				if (cmdi < cmds.length-1)
					j(this).val(cmds[++cmdi]);
				
				this.select();
				//this.setSelectionRange(0, 9999);
			}
		});
	}
		
    Event.listen('internal_colorize', new Colorize().process);
    
    Event.listen('after_display', function(m) {
    	sesslog += m.replace(/<br>/gi, '\n').replace(/<.+?>/gm, ''); 
    	return m 
    });
    
	var add = function(A) {
		
		var my = j(id + ' .out');
		
		if (my[0].scrollHeight > o.scrollback) {
			j(id + ' .out').children().slice(0,100).remove();
			var t = j(id + ' .out').html(), i = t.indexOf('<span');
			j(id + ' .out').html(t.slice(i));
		}
		
		my.append('<span>'+A+'</span>');
		my.scrollTop(my.prop('scrollHeight'));
		
		if (j(id + ' .freeze').length)
			j(id + ' .freeze').append('<span>'+A+'</span>');
	}
	
	var echo = function(msg) {
		
		if (!msg.length) 
			return;
			
		if (o.local && o.echo) {
			
			msg = msg.replace(/>/g,'&gt;');
			msg = msg.replace(/</g,'&lt;');
			
			add('<span style="color: gold; opacity: 0.6">' + msg + '</span><br>');
		}
	}
	
	var title = function(t) {
		win.title(t);
		document.title = t;
	}
	
	title(param('host') + ':' + param('port'));
	
	var echoOff = function() { o.echo = 0 }
	var echoOn = function() { o.echo = 1 }
	
	var sv = {
		add: add,
		echo: echo,
		echoOff: echoOff,
		echoOn: echoOn,
		title: title,
		id: id,
		win: win
	}

	var ws = new Socket({
		host: param('host'),
		port: param('port'),
		out: sv
	});
	
	if (user && user.id) {
		Config.MacroPane = new MacroPane({
			socket: ws
		});
		
		if (!Config.nomacros) {
			Event.listen('before_send', Config.MacroPane.sub);
			sv.echo('Activating macros.');
		}
		
		Config.TriggerHappy = new TriggerHappy({
			socket: ws
		});
		
		if (!Config.notriggers) {
			Event.listen('after_display', Config.TriggerHappy.respond);
			sv.echo('Activating triggers.');
		}
	}
	
	Config.ScrollView = sv;
		
	Event.fire('scrollview_ready', null, sv);

	return sv
}