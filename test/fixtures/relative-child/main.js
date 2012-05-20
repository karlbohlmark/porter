var child = require('./sub/child');
module.exports = function(){
	return ['/main'].concat(child());
}