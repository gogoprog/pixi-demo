/**
 * A bidirectional hash that allows constant-time lookup
 * @param {string} map1   name of the first value category
 * @param {string} map2   name of the second value category
 */
function Bimap (map1, map2) {
	if (typeof map1 !== 'string' || typeof map2 !== 'string') {
		throw 'Expected two map name strings as arguments';
	}

	this.bijection = {};
	this.bijection[map1] = map2;
	this.bijection[map2] = map1;

	this[map1] = {};
	this[map2] = {};

	// makes accessing the maps clearer
	this[map1 + 'From'] = function (key) { return this[map2][key]; };
	this[map2 + 'From'] = function (key) { return this[map1][key]; };
}

/**
 * Add a value pair to the Bimap
 * @param {object} obj   An object with two keys equal to the Bimap's
 *   categories, and their respective values
 */
Bimap.prototype.add = function add (obj) {
	if (typeof obj !== 'object') {
		throw 'Expected an object as an argument';
	}

	var keys = Object.keys(obj);
	var map1 = keys[0];
	var map2 = keys[1];

	if (this.bijection[map1] !== map2) {
		throw 'Expected the argument\'s keys to correspond to the Bimap\'s two map names';
	}

	this[map1][obj[map1]] = obj[map2];
	this[map2][obj[map2]] = obj[map1];
};

/**
 * Remove a value pair from the Bimap
 * @param  {string} map                  name of the category we're searching
 * @param  {*}      value                value within the category to delete
 * @return {*}      correspondingValue   other value in the pair that was deleted
 */
Bimap.prototype.remove = function remove (map, value) {
	var bijection = this.bijection[map];
	var correspondingValue = this[map][value];

	// delete from the bijection
	delete this[bijection][correspondingValue];

	// delete from the specified map
	delete this[map][value];

	return correspondingValue;
};

export default Bimap;
