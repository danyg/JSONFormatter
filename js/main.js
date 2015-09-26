(function(){
	'use strict';

	var formatWorker = new Worker("js/formatter.js");
	var plugins = [],
		$appBar
	;

	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.getSession().setMode("ace/mode/json");

	window.editor = editor;

	formatWorker.onerror = function(e) {
		console.error(e);
	}

	formatWorker.onmessage = function(e) {
		var data = JSON.parse(e.data);

		if(data.error !== false) {
			error(data.error);
		} else {
			var doc = editor.getSession().getDocument();


			// execute plugins

			plugins.forEach(function(plugin) {
				data.data = plugin.format(data.data);
			});

			var cur = editor.getCursorPosition();
			doc.setValue(data.data.replace(/\ucafe/g, '\t'));
			editor.moveCursorTo(cur.row, cur.column);
			editor.getSession().getSelection().clearSelection();
		}
	}

	function formatDocument() {
		var doc = editor.getSession().getDocument();
		var json = doc.$lines.join(doc.$autoNewLine);

		plugins.forEach(function(plugin) {
			json = plugin.unformat(json);
		});

		formatWorker.postMessage(json);
	};

	editor.commands.addCommand({
		name: 'Format',
		bindKey: {win: 'Ctrl-Shift-F',	mac: 'Command-Shift-F'},
		exec: function(editor) {
			formatDocument();
		},
		readOnly: true // false if this command should not apply in readOnly mode
	});

	editor.commands.addCommand({
		name: 'prevent-ctrl-r',
		bindKey: {win: 'Ctrl-R',	mac: 'Command-R'},
		exec: editor.commands.commands.replace.exec,
		readOnly: true // false if this command should not apply in readOnly mode
	});

	$(document).ready(function() {
		$('.BTN_FORMAT').click(formatDocument);
		$appBar = $('#app-bar');

		plugins.forEach(function(plugin) {
			plugin.init();
		});


		(function(){
			var ix=0;

			$(document).ready(function() {
				$('#alert button').click(function(){
					dfd.resolve();
				});
			});

			window._alert = function(text, className) {
				var id = 'alert-' + (ix++);
				$('<div class="alert alert-dismissible ' + className + ' fade in" id="'+ id +'" role="alert">' +
					'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>' +
					'<p>'+arguments[0]+'</p>'+
				'</div>').css('opacity', '0').appendTo('#alertBox').css('opacity', '1').alert();

				setTimeout(function() {
					$('#'+id)
						.alert('close')
					;
				}, arguments[0].length * 200);
			};

			window.info = function() {
				window._alert(arguments[0], 'alert-info');
			};

			window.alert = function() {
				window._alert(arguments[0], 'alert-warning');
			};

			window.error = function() {
				window._alert(arguments[0], 'alert-danger');
			}

			window.hideModal = function() {
				$('.alert')
					.alert('close')
				;
			};
		}());
	});

	////////////////////////////////////////////////////////////////////////////
	// Plugins
	////////////////////////////////////////////////////////////////////////////

	// identation
	// ==========

	var identation = {
		_options: [
			{ title: 'Tab character', str: '\t' },
			{ title: '2 spaces', str: '  ' },
			{ title: '4 spaces', str: '    ' },
			{ title: '8 spaces', str: '        ' },
			{ title: '2 nbsp', str: '&nbsp;&nbsp;' },
			{ title: '4 nbsp', str: '&nbsp;&nbsp;&nbsp;&nbsp;' },
			{ title: '8 nbsp', str: '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' },
		],
		_optSelected: null,
		_lastOptSelected: null,
		init: function() {
			var ix = localStorage.getItem('indent-opt');
			if(ix === null) {
				ix = 0;
			}
			this._optSelected = this._options[ix];
			this._lastOptSelected = this._options[ix];
			this._placeTool();
		},
		format: function(str) {
			this._lastOptSelected = this._optSelected;
			return str.replace(/\ucafe/g, this._optSelected.str);
		},
		unformat: function(str) {
			return str.replace(new RegExp(this._lastOptSelected.str, 'g'), '\t');
		},

		_placeTool: function() {
			var me = this;
			var $select = $('<select></select>');
			this._options.forEach(function(item, i) {
				var $option = $('<option>')
						.val(i)
						.text(item.title)
				;
				if (me._optSelected === item) {
					$option.attr('selected', true);
				}
				$option.appendTo($select);
			});
			$('<div class="tool"></div>')
				.append($('<label>Indent:</label>'))
				.append($select)
				.appendTo($appBar)
			;
			$select.on('change', function() {
				var ix = $(this).val();
				me._select(ix);
			});
		},
		_select: function(ix){
			this._optSelected = this._options[ix];
			localStorage.setItem('indent-opt',ix);
			formatDocument();
		}
	};

	plugins.push(identation);

	// HTML?
	// ==========

	var html = {
		_optSelected: null,
		_lastOptSelected: null,

		init: function() {
			var opt = localStorage.getItem('html-opt');
			if(opt === null) {
				opt = false;
			}
			opt = opt === 'true';
			this._optSelected = opt;
			this._lastOptSelected = opt;
			this._placeTool();
		},
		format: function(str) {
			this._lastOptSelected = this._optSelected;
			if(this._optSelected){
				return str.replace(/\n/g, '\n<br/>');
			} else {
				return str;
			}
		},
		unformat: function(str) {
			if(this._lastOptSelected) {
				return str.replace(new RegExp('\n<br/>', 'g'), '\n');
			} else {
				return str;
			}
		},

		_placeTool: function() {
			var me = this;
			var $checkbox = $('<input type="checkbox" value="true"/>');
			if(!!this._optSelected) {
				$checkbox.attr('checked', true);
			}
			$('<div class="tool"></div>')
				.append(
					$('<label>HTML output</label>').append($checkbox))
				.appendTo($appBar)
			;
			$checkbox.on('change', function() {
				var val = $(this).is(':checked');
				me._setState(val);
			});
		},
		_setState: function(val){
			this._optSelected = !!val;
			localStorage.setItem('html-opt', !!val ? 'true' : 'false');
			formatDocument();
		}
	};

	plugins.push(html);


	// skin
	// ==========

	var skin = {
		_options: [
			{ title: 'Ambiance', path: 'ace/theme/ambiance'},
			{ title: 'Chaos', path: 'ace/theme/chaos'},
			{ title: 'Chrome', path: 'ace/theme/chrome'},
			{ title: 'Clouds', path: 'ace/theme/clouds'},
			{ title: 'Clouds Midnight', path: 'ace/theme/clouds midnight'},
			{ title: 'Cobalt', path: 'ace/theme/cobalt'},
			{ title: 'Crimson editor', path: 'ace/theme/crimson editor'},
			{ title: 'Dawn', path: 'ace/theme/dawn'},
			{ title: 'Dreamweaver', path: 'ace/theme/dreamweaver'},
			{ title: 'Eclipse', path: 'ace/theme/eclipse'},
			{ title: 'Github', path: 'ace/theme/github'},
			{ title: 'Idle Fingers', path: 'ace/theme/idle fingers'},
			{ title: 'Iplastic', path: 'ace/theme/iplastic'},
			{ title: 'Katzenmilch', path: 'ace/theme/katzenmilch'},
			{ title: 'KR Theme', path: 'ace/theme/kr theme'},
			{ title: 'Kuroir', path: 'ace/theme/kuroir'},
			{ title: 'Merbivore', path: 'ace/theme/merbivore'},
			{ title: 'Merbivore soft', path: 'ace/theme/merbivore soft'},
			{ title: 'Mono Industrial', path: 'ace/theme/mono industrial'},
			{ title: 'Monokai', path: 'ace/theme/monokai'},
			{ title: 'Pastel On Dark', path: 'ace/theme/pastel on dark'},
			{ title: 'Solarized Dark', path: 'ace/theme/solarized dark'},
			{ title: 'Solarized Light', path: 'ace/theme/solarized light'},
			{ title: 'Sqlserver', path: 'ace/theme/sqlserver'},
			{ title: 'Terminal', path: 'ace/theme/terminal'},
			{ title: 'Textmate', path: 'ace/theme/textmate'},
			{ title: 'Tomorrow', path: 'ace/theme/tomorrow'},
			{ title: 'Tomorrow Night', path: 'ace/theme/tomorrow night'},
			{ title: 'Tomorrow Night Blue', path: 'ace/theme/tomorrow night blue'},
			{ title: 'Tomorrow Night Bright', path: 'ace/theme/tomorrow night bright'},
			{ title: 'Tomorrow Night Eighties', path: 'ace/theme/tomorrow night eighties'},
			{ title: 'Twilight', path: 'ace/theme/twilight'},
			{ title: 'Vibrant Ink', path: 'ace/theme/vibrant ink'},
			{ title: 'Xcode', path: 'ace/theme/xcode'}
		],
		_optSelected: null,
		_lastOptSelected: null,
		init: function() {
			var ix = localStorage.getItem('skin-opt');
			if(ix === null) {
				ix = 31;
			}
			this._optSelected = this._options[ix];
			this._lastOptSelected = this._options[ix];
			this._placeTool();

			this._set();
		},
		format: function(str) {
			return str;
		},
		unformat: function(str) {
			return str;
		},

		_placeTool: function() {
			var me = this;
			var $select = $('<select class="pull-right"></select>')
				.appendTo($appBar)
			;
			this._options.forEach(function(item, i) {
				var $option = $('<option>')
						.val(i)
						.text(item.title)
				;
				if (me._optSelected === item) {
					$option.attr('selected', true);
				}
				$option.appendTo($select);
			});
			$select.on('change', function() {
				var ix = $(this).val();
				me._select(ix);
			});
		},
		_select: function(ix){
			this._optSelected = this._options[ix];
			localStorage.setItem('skin-opt', ix);
			this._set();
		},
		_set: function() {
			editor.setTheme(this._optSelected.path);
		}
	};

	plugins.push(skin);


}());