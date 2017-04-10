let ejs = require("ejs");

let compile = function(template, data){
	let str = template.replace("{", "<%").replace("}", "%>");

	let options = {};

	return ejs.render(str, data, options);
}

module.exports = compile;