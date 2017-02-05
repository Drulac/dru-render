let render = (app, framework)=>{

	this.output = "";
	this.framework = framework;

	let components = [];

	let usedIds = [];

	let dir = __dirname;
	let fs = require("fs");
	let path = require("path");
	let serialize = require("serialize-javascript");
	let jsbeautifier = require("js-beautify");
	let victorica = require('victorica');

	let fdir = dir+"/frameworks/"+framework+"/";
	let fconfig = require(fdir+"framework.json");

	let clear = (str)=>{
		while(str.match(/(\r\n|\n|\r)/g) != null)
		{
			str = str.replace(/(\r\n|\n|\r)/g, (match, p1)=>{
				return " ";
			});
		}

		str = str.replace(/\t/g, " ");
		while(str.search("	") != -1)
			str = str.replace(/	/g, " ");

		return str;
	};

	let lastClear = (str)=>{
		str = clear(str);

		while(str.match(/([^\\])\"/g) != null)
		{
			str = str.replace(/([^\\])\"/g, (match, p1)=>{
				return p1+"\\\"";
			});
		}

		return str;
	};

	let stringify = (func)=>{
		let code = func.toString().split("{");
		delete code[0];
		code = code.join("{").split("}");
		delete code[code.length-1];
		code = code.join("}");
		code = code.slice(1, code.length-1);
		code = code.slice(0, code.length-2);
		return serialize(code);
	};

	let randomID = ()=>{
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

		for( var i=0; i < 32; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		if(usedIds.indexOf(text) != -1)
		{
			text = randomID();
		}else{
			usedIds.push(text);
		}

		return text;
	};

	fs.getFiles = function(dir){
		let files_ = [];
		let files = fs.readdirSync(dir);
		for (let i in files){
			let name = dir + '/' + files[i];
			if (fs.statSync(name).isDirectory()){
				fs.getFiles(name, files_);
			} else {
				files_.push(name);
			}
		}
		return files_;
	};

	let loadFile = (file, cb)=>{
		fs.readFile(file, {encoding: 'utf-8'}, function(err,data){
			if (!err){
				cb(data);
			}else{
				console.log(err);
			}
		});
	};

	let loadFileSync = (file)=>{
		return fs.readFileSync(file, "utf-8");
	};

	let loadRessources = ()=>{
		let output = "";
		for(let i in fconfig.css)
		{
			let path = "";
			if(!fconfig.css[i].startsWith("https://") && !fconfig.css[i].startsWith("http://"))
			{
				path = "/"+framework+"/css/"+fconfig.css[i];
			}else{
				path = fconfig.css[i];
			}
			output += "<link href=\""+path+"\" rel=\"stylesheet\">\n";
		}
		for(let i in fconfig.js)
		{
			let path = "";
			if(!fconfig.js[i].startsWith("https://") && !fconfig.js[i].startsWith("http://"))
			{
				path = "/"+framework+"/js/"+fconfig.js[i];
			}else{
				path = fconfig.js[i];
			}
			output += "<script src=\""+path+"\"></script>\n";
		}
		return output;
	};

	let loadRouteRessources = ()=>{
		for(file of fconfig.js)
		{
			if(!file.startsWith("https://") && !file.startsWith("http://"))
			{
				let content = loadFileSync(fdir+file);
				app.get("/"+framework+"/js/"+file, function(req, res, next){
					next({content: content, code : 200, contentType: {"Content-Type": "text/js"}});
				});
			}
		}
		for(file of fconfig.css)
		{
			if(!file.startsWith("https://") && !file.startsWith("http://"))
			{
				let content = loadFileSync(fdir+file);
				app.get("/"+framework+"/css/"+file, function(req, res, next){
					next({content: content, code : 200, contentType: {"Content-Type": "text/css"}});
				});
			}
		}
	};

	let compilComponent = (component)=>{
		// Compiling template
		if(typeof component == "object")
		{
			let code = component.code;
			if(code.search("<%") != -1)
			{
				
				//convert the code
				code = code.replace(/\<\%\=((.|\n)*?)\%\>/gm, (match, p1)=>{
					if(p1 != "" && p1 != null)
					return "<% code += "+p1+";\n %>";
				});
				code = code.replace(/\%\>((.|\n)*?)\<\%/gm, (match, p1)=>{
					let retour = serialize(clear(p1));
					if(retour != "" || retour != null){
						return "code += "+retour+";\n";
					}else{ return ""; }
				});
				code = code.replace(/((.|\n)*?)\<\%/gm, (match, p1)=>{
					let retour = serialize(clear(p1));
					if(retour != "" || retour != null){
						return "code += "+retour+";\n";
					}else{ return ""; }
				});
				code = code.replace(/\%\>((.|\n)*)/gm, (match, p1)=>{
					let retour = serialize(clear(p1));
					if(retour != "" || retour != null){
						return "code += "+retour+";\n";
					}else{ return ""; }
				});
				code = "let code = \"\";\n"+code;
				code += "return code;\n";


				//delete inutile spaces
				while(code.match(/\n( |\t|\n)/g) != null)
				{
					code = code.replace(/\n( |\t|\n)/g, "\n");
				}



				while(code.match(/code \+= "";\n/g) != null)
				{
					code = code.replace(/code \+= "";\n/g, "");
				}

				while(code.match(/\\u003E/g) != null)
				{
					code = code.replace(/\\u003E/g, ">");
				}

				while(code.match(/\\u003C/g) != null)
				{
					code = code.replace(/\\u003C/g, "<");
				}

				while(code.match(/\\u002F/g) != null)
				{
					code = code.replace(/\\u002F/g, "\/");
				}

				while(code.match(/\ncode \+= ([^\n;]+);\ncode \+= ([^\n;]+)/g) != null)
				{
					code = code.replace(/\ncode \+= ([^\n;]+);\ncode \+= ([^\n;]+)/g, (match, p1, p2)=>{
						return "\ncode += "+p1+" + "+p2+"";
					});
				}
	
				//beautify the code
				code = jsbeautifier(code);

				component.code = code;
				return component;
			}else{
				let id = randomID();
				component.id.push(id);

				code = "<composant id=\""+id+"\">"+code+"</composant>";
				return code;
			}
		}else{
			return component;
		}
	};

	let executeComponent = (component, params)=>{
		//binding params
		let code = component.code;

		let argsNames = "";
		let argsValues = [];
		let arr = Object.getOwnPropertyNames(params);

		let addArg = (name, value)=>{
			if(argsNames !== "")
			{
				argsNames += ",";
			}
			argsNames += name;
			argsValues.push(value);
		};


		for(let i in arr)
		{
			if(arr[i] != "content")
			{
				let value = params[arr[i]];
				addArg(arr[i], value);
			}else{
				let value = params[arr[i]];
				addArg(arr[i], value);
				//addArg(arr[i], "<content>"+value+"</content>");
			}
		}







		let events = [];

		let on = function(e, cb){
			events.push({e: e, cb: cb});
		};

		let self = {self: component.last, selfs: component.domAll, on: on};




		error = 1;
		var execute;
		while(error > 0)
		{
			try{
				execute = new Function(argsNames, code);
				execute = execute.bind(self);
				execute = execute.apply(null, argsValues);
				error = 0;
			}catch(e){
				varName = e.toString().match(new RegExp("ReferenceError: (.*) is not defined"));
				if(varName != null)
				{
					varName = varName[1];
					code = "let "+varName+" = \"\";\n"+code;
					error++;
				}else{
					console.log(code);
					console.log(e);
					break;
				}
			}
		}

		let id = randomID();

		execute = "<composant type=\""+component.name+"\">"+execute+"</composant>";

		return execute;
	};

	let loadCode = (component)=>{
		component.code = loadFileSync(component.path);
		component = compilComponent(component);
	
		return component;
	};

	let listComponents = ()=>{
		let files = fs.getFiles(fdir+"components");
		let composants = [];

		//load all of the components (.html)
		for(file of files)
		{
			var path = require('path')

			let ext = path.extname(file)
			if(ext === ".html")
			{
				let composant = {path: file};
				file = file.split("/");
				file = file[file.length-1];

				composant.name = file.replace(".html", "");
				composant.params = {};
				composant = loadCode(composant);
				composants[composant.name] = composant;
			}
		}

		//load all of the components' style (.css)
		for(file of files)
		{
			var path = require('path')

			let ext = path.extname(file)
			if(ext === ".css")
			{
				let name = file.split("/");
				name = name[name.length-1];
				name = name.replace(".css", "");

				let css = loadFileSync(file);
				let patterns = css.match(/(^|\n)([^}{]*)((?:(?!{)(.))*)/g);

				for(pattern of patterns)
				{
					if(!new RegExp(/}/).test(pattern))
					{
						css = css.replace(pattern, "composant[type=\""+name+"\"] "+pattern)
					}
				}
				composants[name].css = css;
			}
		}

		return composants;
	};

	let loadComponents = ()=>{
		components = listComponents();
	};

	let listCssOfComponents = ()=>{
		let output = "";
		for(componentName in components)
		{
			component = components[componentName];

			if(component.css != undefined)
			{
				output += component.css;
			}
		}
		return output;
	};

	let makeComponentsCss = ()=>{
		let css = listCssOfComponents();
		app.get("/"+framework+"/css/components.css", function(req, res, next){
			next({content: css, code : 200, contentType: {"Content-Type": "text/css"}});
		});
	};

	loadComponents();
	loadRouteRessources();
	makeComponentsCss();

	this.rend = (file, next)=>{
		loadFile(file, (content)=>{
			let retour = "";

			let replace = ()=>{
				let find = 0;
				for(composantName in components)
				{
					composant = components[composantName];
					let pattern = "";
					if(pattern !== "")
					{
						pattern += "|";
					}
					pattern = new RegExp("<("+composant.name+")([^<>]*)>((?:(?!<\/"+composant.name+">)(.|\n))*)<\/"+composant.name+">", "");

					while(pattern.test(content))
					{
						find++;
						content = content.replace(pattern, function(m, openbalise, attributs, contenu, closeBalise) {
							return executeComponent(composant, {content: contenu});
						});
					}
				}
				if(find > 0)
				{
					replace();
				}
			};

			replace();

			let css = loadRessources();

			css += "<link href=\"/"+framework+"/css/components.css\" rel=\"stylesheet\">";

			content = content.replace(/<\/head>/i, css+"</head>");


			var options= {
				// indentation character 
				space: '	',
				// doesn't handle the innerHTML of matching elements 
				ignore: [],
				// if true, remove self closing char (e.g <img /> -> <img>) 
				removeSelfClose: true,
			};
			content = victorica(content, options);


			next({content: content, code: 200, contentType: {"Content-Type": "text/html"}});
		});
	};

	return this;
};

module.exports = render;