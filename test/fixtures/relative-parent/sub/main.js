var child = require('../parent');
module.exports = function(){
	return ['/main'].concat(child());
}