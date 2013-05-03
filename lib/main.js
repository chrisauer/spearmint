(function (){
	var fs = require('fs-extra');
	var hogan = require('hjs');
	var yaml = require('yaml-front-matter');
	var marked = require('marked');
	var glob = require('glob');

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

	/** method to async load the posts and add them to array, calls callback once array is ready */
	var _loadPosts = function (callback) {
		glob('_posts/**/*.md', function (err, files) {
			if (err) callback(err);
			var posts = [];
			files.forEach(function (file) {
				var split = file.split('/');

				// create initial data
				var post = {
					name: split[split.length-1].split('.')[0],
					url: file.replace('_posts/', '').split('.')[0] + '.html',
					raw: fs.readFileSync(file, 'utf8') 
				};

				// create yaml based data
				post.data = yaml.loadFront(post.raw);

				// create markedown compiled content
				post.data.content = marked(post.data.__content);

				posts.push(post);
			});
			callback(null, posts);
		});
	};


	var layouts = _loadLayouts();
	_loadPosts(function (err, posts) {
		posts.forEach(function (post) {
			console.log('generating ' + post.name + ' to ' + post.url);
			fs.outputFileSync('_site/' + post.url, layouts[post.data.layout].compiled.render(post.data), 'utf8');
		})
	});

}).call(this);