(function(root, factory){
    if( typeof define === 'function' && define.amd )
        define(['angular'], factory);
    else
        root.ngDownloadContent = factory(root.angular);
}(this, function(angular){
    'use strict';
    
    return angular.module('downloadContent', [])
    .factory('downloadContent', ['$log', function($log){
        return function(content, filename){
            // Using the FileSaver.js polyfil.
            var d = new Blob([content], {type: 'text/plain;charset=utf-8'});
            saveAs(d, filename);
            // As data URI
            //window.open('data:text/plain;charset=utf-8,' + window.encodeURIComponent(content));
        };
    }]);
}));