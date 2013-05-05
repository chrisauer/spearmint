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
		pages: '_pages',
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

/**
 * get all the posts and call the callback once 
 * transformed into json object
 */
spearmint.posts = function (callback) {
	_load(
		path.join(spearmint.options.paths.base, spearmint.options.paths.posts),
		_postFactory,
		callback
	);
};

/**
 * get all the pages and call the callback once
 * transformed into json object
 */
spearmint.pages = function (callback) {
	_load(
		path.join(spearmint.options.paths.base, spearmint.options.paths.pages),
		_pageFactory,
		callback
	);
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

/** same logic is used to load the pages and the posts, just different paths */
var _load = function (dir, factory, callback) {
	glob(
		path.join(dir, '**', '*'),
		function (err, files) {
			if (err) callback(err, null);
			else {
				files.reverse();
				var results = [];
				files.forEach(function (file) {
					var obj = factory(file);
					if (obj) {
						results.push(obj);					
					}
				});
				callback(null, results);				
			}
		}
	);	
}

/** build the post object from the file */
var _postFactory = function (file) {
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

// TODO: duplicate code with postFactory, refactor/cleanup later
var _pageFactory = function (file) {
	try {
		stats = fs.lstatSync(file);

		// TODO: this seems overly complicated, could probably clean this up
		if (!stats.isDirectory()) {
			var page = {
				name: path.basename(file, path.extname(file)),
				type: path.extname(file).replace('.',''), 
				raw: fs.readFileSync(file,'utf8')
			};
			var basedir = path.join(spearmint.options.paths.base, spearmint.options.paths.pages) + path.sep;
			page.relative = file.replace(basedir, '').split(path.sep);
			page.relative[page.relative.length-1] = page.name + '.html'; 
			page.url = page.relative.join('/');
			page.data = yaml.loadFront(page.raw);
			if (page.data) {
				page.data.url = page.url;
				page.data.name = page.name;
				page.data.type = page.type;
				page.data.content = marked(page.data.__content);				
			} else {
				page.raw = fs.readFileSync(file);
			}
			return page;

		}
	} catch (e) {
		console.log(e);
	}
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

			// TODO: better error handling
			// TODO: duplicate code with post, fixme
			// After we load all the posts, because that is used
			// in the global
			spearmint.pages(function (err, pages) {
				pages.forEach(function (page) {
					if (page.data && page.data.layout) {
						page.data.globals = globals;
						console.log('Generating page ' + page.name + ' with layout ' + page.data.layout);
						fs.outputFileSync(
							spearmint.options.paths.base + path.sep + spearmint.options.paths.output + path.sep + page.relative.join(path.sep),
							layoutCache[page.data.layout].render(page.data),
							'utf8'
						);
					} else {
						page.relative[page.relative.length-1] = page.name + '.' + page.type;
						fs.outputFileSync(
							spearmint.options.paths.base + path.sep + spearmint.options.paths.output + path.sep + page.relative.join(path.sep),
							page.raw
						);						
					}

				});
			});

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
};