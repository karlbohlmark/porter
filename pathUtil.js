exports.commonDir = function(dirs){
	if(!dirs.length) return '/';
	var common = '';
	var currentIndex=0
	do{
		var currentChar = dirs[0][currentIndex];
		if(!currentChar) break;
		var isCommon = dirs.every(function(dir){
			return dir[currentIndex] == currentChar;
		});

		if(isCommon){
			common+=currentChar;
		}
		
		currentIndex++;
	}while(isCommon)
	return common;
}