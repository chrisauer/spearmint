module.exports = {
	'test spearmint.version': function (beforeExit, assert) {
		var spearmint = require('../lib/main.js');
		assert.equal('0.2.0', spearmint.version);
	}, 

	'test spearmint.layouts': function (beforeExit, assert) {
		var spearmint = require('../lib/main.js');
		spearmint.options.paths.base = 'example';
		var results = [];
		spearmint.layouts(function (err, layouts) {
			if (err) assert.equal(1,2);
			results = layouts;
		});
		beforeExit(function () {
			assert.equal(1, results.length);
			assert.equal('post', results[0].name);
			assert.equal('hjs', results[0].type);
			assert.isNotNull(results[0].raw);
		});
	},

	'test spearmint.posts': function (beforeExit, assert) {
		var spearmint = require('../lib/main.js');
		spearmint.options.paths.base = 'example';
		var results = [];
		spearmint.posts(function (err, posts) {
			if (err) assert.equal(1,2);
			results = posts;
		});
		beforeExit(function () {
			assert.equal(2, results.length);
			assert.equal('test', results[0].name);
			assert.equal('md', results[0].type);
			assert.deepEqual(['test.html'], results[0].relative);
			assert.deepEqual(['subfolder', 'test2.html'], results[1].relative);
			assert.equal('test.html', results[0].url);
			assert.isNotNull(results[0].data);
			assert.equal('testing', results[0].data.title);

			assert.equal('subfolder/test2.html', results[1].url);

			assert.isNotNull(results[0].raw);
		});
	},

	'test spearmint.pages': function (beforeExit, assert) {
		var spearmint = require('../lib/main.js');
		spearmint.options.paths.base = 'example';
		var results = [];
		spearmint.pages(function (err, pages) {
			if (err) assert.equal(1,2);
			results = pages;
		});
		beforeExit(function () {
			assert.equal(1, results.length);
			assert.equal('index', results[0].name)
			assert.equal('example blog', results[0].data.title);
			assert.equal('post', results[0].data.layout);
			assert.isNotNull(results[0].raw);
		});
	}

}
