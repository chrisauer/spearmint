(function (){
	var fs = require('fs');
	var hogan = require('hjs');
	var yaml = require('yaml-front-matter');
	var marked = require('marked');

	// create an object that has all the templates compiled
	var _loadLayouts = function () {
		var results = {};
		fs.readdirSync('_layouts').forEach(function (file) {

			// create the template object
			var template = {
				name: file.split('.')[0],
				raw: fs.readFileSync('_layouts/'+file, 'utf8')
			};

			// TODO: we don't need to force hogan, eventually support
			// different templating engines
			template.compiled = hogan.compile(template.raw);
			results[template.name] = template;
		});
		return results;
	};

	var _loadPosts = function () {
		marked.setOptions({gfm: true});
		var results = [];
		fs.readdirSync('_posts').forEach(function (file) {
			var post = {
				name: file.split('.')[0],
				raw: fs.readFileSync('_posts/'+file, 'utf8')
			};

			post.data = yaml.loadFront(post.raw);
			post.data.content = marked(post.data.__content);

			results.push(post);
		});

		return results;
	};

	var layouts = _loadLayouts();
	var posts = _loadPosts();

	// for each post, write out the file
	posts.forEach(function (post) {
		console.log("Generating page " + post.name + ".html");

		// TODO: add error checking here
		var output = layouts[post.data.layout].compiled.render(post.data);
		fs.writeFileSync('_site/' + post.name + ".html", output, 'utf8');
	});

	process.argv.forEach(function (val, index, array) {
		console.log(index + ': ' + val);
	});

}).call(this);