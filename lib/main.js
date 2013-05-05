// 
// Spearmint.js
// Building static blog pages like everyone else.
// 

var fs = require('fs-extra'),
	hogan = require('hjs'),
	yaml = require('yaml-front-matter'),
	marked = require('marked'),
	glob = require('glob'),
	path = require('path'),
	spearmint = exports;

// options 
spearmint.options = {
	paths: {
		base: 'example',
		layouts: '_layouts',
		posts: '_posts',
		static: '_static',
		output: '_site'
	}
};

// version number
spearmint.version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'))).version;

/**
 * get all the layouts, compile, and call the given
 * callback function once the layouts have been loaded
 */
spearmint.layouts = function (callback) {
	fs.readdir(path.join(spearmint.options.paths.base, spearmint.options.paths.layouts), function (err, files) {
		if (err) callback(err, null);
		var results = [];
		files.forEach(function (file) {
			results.push(_buildLayout(file));
		});
		callback(null, results);
	})
};

/** build the layout object from the file */
var _buildLayout = function (file) {
	return {
		name: file.split('.')[0],
		type: file.split('.')[1], 
		raw:  fs.readFileSync(
			path.join(spearmint.options.paths.base, spearmint.options.paths.layouts, file), 
			'utf8'
		)
	};
};

var _compileLayout = function (layout) {
	if (layout.type === 'hjs') {
		return hogan.compile(layout.raw);
	}
	return null;
};

/**
 * get all the posts and call the callback once 
 * transformed into json object
 */
spearmint.posts = function (callback) {
	glob(
		path.join(spearmint.options.paths.base, spearmint.options.paths.posts, '**', '*'),
		function (err, files) {
			if (err) callback(err, null);
			files.reverse();
			var results = [];
			files.forEach(function (file) {
				var post = _buildPost(file);
				if (post) {
					results.push(_buildPost(file));					
				}
			});
			callback(null, results);
		}
	);	
};

/** build the post object from the file */
var _buildPost = function (file) {
	try {
		stats = fs.lstatSync(file);

		// TODO: this seems overly complicated, could probably clean this up
		if (!stats.isDirectory()) {
			var post = {
				name: path.basename(file, path.extname(file)),
				type: path.extname(file).replace('.',''), 
				raw:  fs.readFileSync(file,'utf8')
			};
			var basedir = path.join(spearmint.options.paths.base, spearmint.options.paths.posts) + path.sep;
			post.relative = file.replace(basedir, '').split(path.sep);
			post.relative[post.relative.length-1] = post.name + '.html'; 
			post.url = post.relative.join('/');
			post.data = yaml.loadFront(post.raw);
			post.data.url = post.url;
			post.data.name = post.name;
			post.data.type = post.type;
			post.data.content = marked(post.data.__content);
			return post;

		}
	} catch (e) {}
};

spearmint.run = function () {

	// get all the layouts
	spearmint.layouts(function (err, layouts) {
		if (err) console.log('Error while reading the layouts: ' + err);

		// create a layout cache
		var layoutCache = {};
		layouts.forEach(function (layout) {
			console.log('Compiling layout ' + layout.name);
			layoutCache[layout.name] = _compileLayout(layout);
		});

		// get all the posts
		spearmint.posts(function (err, posts) {
			var globals = {posts: posts};

			if (err) console.log('Error while reading the posts: ' + err);

			posts.forEach(function (post) {

				// if there is a layout specified 
				if (post.data.layout) {
					post.data.globals = globals;
					console.log('Generating post ' + post.name + ' with layout ' + post.data.layout);
					fs.outputFileSync(
						spearmint.options.paths.base + path.sep + spearmint.options.paths.output + path.sep + post.relative.join(path.sep),
						layoutCache[post.data.layout].render(post.data), 
						'utf8'
					);
				} 

				// otherwise just copy the raw file over
				else {
					fs.outputFileSync(
						path.join(spearmint.options.paths.output, post.relative),
						post.raw,
						'utf8'
					);
				}
 			});
		});

	});
}

// (function (){
// 	var fs = require('fs-extra');
// 	var hogan = require('hjs');
// 	var yaml = require('yaml-front-matter');
// 	var marked = require('marked');
// 	var glob = require('glob');

// 	// stores global information to be used in site templates
// 	var globals = {};

// 	// create an object that has all the templates compiled
// 	var _loadLayouts = function () {
// 		var results = {};
// 		fs.readdirSync('_layouts').forEach(function (file) {

// 			// create the template object
// 			var template = {
// 				name: file.split('.')[0],
// 				raw: fs.readFileSync('_layouts/'+file, 'utf8')
// 			};

// 			// TODO: we don't need to force hogan, eventually support
// 			// different templating engines
// 			template.compiled = hogan.compile(template.raw);
// 			results[template.name] = template;
// 		});
// 		return results;
// 	};

// 	/** method to async load the posts and add them to array, calls callback once array is ready */
// 	var _loadPosts = function (callback) {
// 		glob('_posts/**/*.md', function (err, files) {
// 			if (err) callback(err);
// 			var posts = [];

// 			files.forEach(function (file) {
// 				var split = file.split('/');

// 				// create initial data
// 				var post = {
// 					name: split[split.length-1].split('.')[0],
// 					url: file.replace('_posts/', '').split('.')[0] + '.html',
// 					raw: fs.readFileSync(file, 'utf8') 
// 				};

// 				// create yaml based data
// 				post.data = yaml.loadFront(post.raw);

// 				// create markedown compiled content
// 				post.data.content = marked(post.data.__content);

// 				posts.push(post);
// 			});
// 			callback(null, posts);
// 		});
// 	};


// 	var layouts = _loadLayouts();
// 	_loadPosts(function (err, posts) {
// 		posts.reverse();
// 		globals.posts = posts;
// 		posts.forEach(function (post) {
// 			post.data.globals = globals;
// 			console.log('generating ' + post.name + ' to ' + post.url);
// 			fs.outputFileSync('_site/' + post.url, layouts[post.data.layout].compiled.render(post.data), 'utf8');
// 		})
// 	});

// }).call(this);