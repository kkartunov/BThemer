var BSThemer = angular.module('BSThemer', ['LessDefVars', 'LessDefVarsInfo', 'LessFiles', 'lsPersist', 'ui.bootstrap', 'ngSanitize', 'cgNotify', 'downloadContent']);


// Start the app when DOM ready.
angular.element(document).ready(function(){
    // Run the App
    angular.bootstrap(document, ['BSThemer']);
});


// The preview iframe.
BSThemer.factory('Preview', [
    function(){
        var ifr = document.getElementById('view').contentWindow,
            docFragm = document.createDocumentFragment(),
            sheet = document.createElement('style');
            preview_js = document.createElement('script');
        
        // Some id to find it easy.
        sheet.id = 'compiled_less';

        // Iframe's JS
        preview_js.src = 'dist/preview_area.js';
        preview_js.type = 'text/javascript';
        preview_js.async = true;

        // Append to the iframe's head.
        docFragm.appendChild(sheet);
        docFragm.appendChild(preview_js);
        ifr.document.head.appendChild(docFragm);

        // Beforeunload listener.
        ifr.addEventListener('beforeunload', function(e){
            var msg = "Leaving the page will result in losing all current changes.\nAre you sure?";
            (e || ifr.event).returnValue = msg;
            return msg;
        });

        // Click disabled in the iframe.
        ifr.addEventListener('click', function(e){
            e.preventDefault();
            return false;
        });
        
        // Return the iframe for further usage.
        return ifr.document;
}]);


// Responsible for handling less compilation errors.
BSThemer.less_error_handler = function(type, err){
    // Check for error presence.
    if( angular.isObject(err) ){
        // Get the app `$injector`.
        var $injector = angular.element(document).injector(),
            notify = $injector.get('notify'),
            ChangeSeq = $injector.get('ChangeSeq');
        // Notify about the error.
        notify(err.message+' -> Undoing last changes...');
        // Call undo automatically.
        ChangeSeq.undo();
    }
};


// Less parser wrapper.
BSThemer.factory('LESS_parser', ['$q', function($q){
    return function(to_parse, options){
        //Show the loader.
        document.getElementById('loader').style.display = 'block';
        var defr = $q.defer(),
            p = less.Parser(angular.extend({}, options));
        // Parse it.
        try{
            p.parse(to_parse, function(err, tree){
                if( err ) defr.reject(err);
                else defr.resolve(tree.toCSS());
                // Hide the loader.
                document.getElementById('loader').style.display = 'none';
            });
        }catch(err){
            defr.reject(err);
            // Hide the loader.
            document.getElementById('loader').style.display = 'none';
        }
        
        return defr.promise;
    };
}]);


// Basic simple CSS code minifier.
BSThemer.factory('CSS_min', [function(){
    return function(input){
        return input
        .replace(/\n|\t/g,'')	//strip \n and \t
        .replace(/\s*(?!<\")\/\*[^\*]+\*\/(?!\")\s*/g,'') //strip comments
        .replace(/([:])\s/g,':');	//strip spaces after :
    };
}]);


// Initial vars supplier.
// Currently returns the LEss default vars but can change in future.
BSThemer.service('InitialLessVars', ['$LessDefVars', function($LessDefVars){
    return $LessDefVars;
}]);


// Change sequence queue container.
BSThemer.factory('ChangeSeq', [
    'InitialLessVars', 'notify',
    function(InitialLessVars, notify){
        // Storage.
        var changes = [angular.copy(InitialLessVars)];

        // API
        return {
            // Adds the current Less vars state to the queue.
            push: function(){
                changes.push(angular.copy(changes[0]));
                // Limit the queue length to save mem.
                if( changes.length > 11)
                    changes.splice(1, 1);
                return this;
            },
            get: function(index){
                return changes[index||0];
            },
            getVars: function(index){
                var vars = {};
                angular.forEach(changes[index||0], function(props, group){
                    angular.extend(vars, props);
                });
                return vars;
            },
            makeVarsFile: function(index){
                var allVars = this.getVars(index),
                    res='';
                angular.forEach(allVars, function(val, varname){
                    res += varname+': '+val+";\n";
                });
                return res;
            },
            updater: function(data){
                if( angular.equals(changes[0], data) )
                    return;
                angular.forEach(data, function(props, group){
                    angular.forEach(props, function(val, varname){
                        changes[0][group][varname] = val;
                    });
                });
            },
            undo: function(){
                // When there are none records in the queue but the first one which actually is always presented
                // cos it is used to rednder the vars gui and holds actuall values
                // undo to the initial vars.
                if( changes.length == 1 ){
                    // Overwrite the actual values with the defaults and return the vars.
                    this.updater(InitialLessVars);
                    notify('Nothing more to undo. Variables are in initial state...');
                    return this.makeVarsFile();
                }else{
                    // Last record.
                    var prev = changes.pop();
                    if( angular.equals(prev, changes[0]) )
                        return this.undo();
                    else
                        this.updater(prev);
                    return this.makeVarsFile();
                }
            },
            reset: function(){
                while(changes.length > 1){
                    changes.pop();
                };
                this.updater(InitialLessVars);
                notify('Variables are in initial state now.');
                return this.makeVarsFile();
            },
            isApplied: function(){
                if(changes.length == 1)
                    return angular.equals(changes[0], InitialLessVars);
                else
                    return angular.equals(changes[0], changes[changes.length-1]);
            },
            all: function(){return changes;}
        };
}]);


// Vars UI controller.
BSThemer.controller('VarsUI', [
    '$scope', 'Preview', 'LESS_parser', 'ChangeSeq', '$log', '$document', 'LessDefVarsInfo', 'notify', '$log', '$http',
    function ($scope, Preview, LESS_parser, ChangeSeq, $log, $document, LessDefVarsInfo, notify, $log, $http) {
        // Less vars data.
        $scope.LVARS = ChangeSeq.get();
        // Less vars help.
        $scope.LVARS_HELP = LessDefVarsInfo;
        // Initial compile Less and load content into the iframe.
        LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.makeVarsFile()).then(
            function(css){
                // Apply css to the preview head.
                Preview.getElementById('compiled_less').innerHTML = css;
                // Fill with default content.
                $http({method: 'GET', url: 'templates/lib/sample_code.html'}).then(
                    // OK.
                    function(rsp){
                        Preview.body.innerHTML = rsp.data;
                        notify('Ready. Start creating...');
                    },
                    // Error.
                    function(){
                        notify('Ops, looks like we could not find sample HTML content to load. Just use the Custom HTML tab to fill this area...');
                        $log.debug('ERROR LOADING SAMPLE HTML', arguments);
                    }
                );
            },
            function(err){
                notify(err.message);
            }
        );

        // Helper counting keys in a obj
        // used in the ng-repeat loop.
        $scope.gCnt = function (g) {
            return Object.keys(g).length;
        };
        
        // Input enter pressed handler.
        $scope.apply_var_change = function(e){
            if( e.which == 13 && !e.shiftKey )
                applier();
        };
        
        var applier = function(){
            // When something is actually changed. Otherwise preview already in sync.
            if( !ChangeSeq.isApplied() ){
                LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.makeVarsFile()).then(
                    function(css){
                        Preview.getElementById('compiled_less').innerHTML = css;
                        ChangeSeq.push();
                    },
                    function(err){
                        notify(err.message+' -> Undoing last changes...');
                        ChangeSeq.undo();
                    }
                );
            }else
                notify('Nothing new to apply');
        };

        // Shortcut apply vars to preview.
        var shortcut_apply = function(e){
            //console.log(e);
            // App shortkeys all use `Shift`.
            if( e.shiftKey ){
                // Apply to preview.
                if( e.which == 13 )
                    applier();
                // reset to initials
                if( e.which == 82 )
                    if( confirm("All variables will be set to initial values!\nAre you sure want to continue?") ){
                        LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.reset()).then(
                            function(css){
                                Preview.getElementById('compiled_less').innerHTML = css;
                            }
                        );
                    }
            }
        };
        $document.on('keypress', shortcut_apply);
        Preview.addEventListener('keypress', shortcut_apply);
}]);


// Nav UI controller.
BSThemer.controller('NavUI', [
    '$scope', 'Preview', '$modal', 'CSS_min', '$http', '$sanitize', 'ChangeSeq', '$LessFiles', '$log', '$lsPersist', 'notify', 'downloadContent', 'LESS_parser',
    function($scope, Preview, $modal, CSS_min, $http, $sanitize, ChangeSeq, $LessFiles, $log, $lsPersist, notify, downloadContent, LESS_parser){
        // Sidebar toggler
        // ---
        $scope.toggleSide = function(){
            if( document.documentElement.clientWidth < 768){
                angular.element(document.getElementById('left')).toggleClass('toff_h').removeClass('toff_w');
                angular.element(document.getElementById('preview')).toggleClass('toff_pt').removeClass('toff_pl');
                angular.element(document.getElementById('nav')).toggleClass('toff_pt').removeClass('toff_pl');
            }else{
                angular.element(document.getElementById('left')).toggleClass('toff_w').removeClass('toff_h');
                angular.element(document.getElementById('preview')).toggleClass('toff_pl').removeClass('toff_pt');
                angular.element(document.getElementById('nav')).toggleClass('toff_pl').removeClass('toff_pt');
            }
            $scope.isSideHidden=!$scope.isSideHidden;
        };
        
        // Undo one step.
        // ---
        $scope.undo = function(){
            LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.undo()).then(
                function(css){
                    Preview.getElementById('compiled_less').innerHTML = css;
                },
                function(err){
                    notify(err.message+' -> Undoing last changes...');
                    $scope.undo();
                }
            );
        };
        
        // Restore initial Less vars.
        // ---
        $scope.restore = function(){
            if( confirm("All variables will be set to initial values!\nAre you sure want to continue?") ){
                LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.reset()).then(
                    function(css){
                        Preview.getElementById('compiled_less').innerHTML = css;
                    }
                );
            }
        };
        
        // Store current state
        // ---
        $scope.save = function(){
            if( !confirm('Are you sure want to replace the saved data with current one?') )
                return;
            // Save the record.
            $lsPersist.set('bthemer', {
                vars: ChangeSeq.get(),
                html: Preview.body.innerHTML
            }).then(
                function(){ notify('Saved locally.'); },
                function(){ $log.debug('save err', arguments); }
            );
        };
        
        // Load local data
        // ---
        $scope.load_local = function(){
            // Get the record.
            $lsPersist.get('bthemer').then(
                function(data){
                    if( data ){
                        if( !confirm('Are you sure want to overwrite your current work with the saved data?') )
                            return;
                        
                        ChangeSeq.updater(data.vars);
                        ChangeSeq.push();
                        LESS_parser(document.getElementById('raw_less').innerHTML+ChangeSeq.makeVarsFile()).then(
                            function(css){
                                Preview.getElementById('compiled_less').innerHTML = css;
                                Preview.body.innerHTML = data.html;
                                notify('Loaded from local');
                            },
                            function(err){
                                notify(err.message);
                                ChangeSeq.undo();
                            }
                        );

                    }else
                        notify('Saved data not available');
                },
                function(){ $log.debug('load err', arguments); }
            );
        };
        
        // Load custom HTML into preview.
        // ----
        $scope.isCustomHTML = false;
        $scope.loadCustomHTML = function(){
            // Get the textarea content and sanitize it.
            var HTML = $sanitize( document.getElementById('ifr_code').value.trim() );
            // Load sample content into the iframe's body.
            if(HTML){
                Preview.body.innerHTML = HTML;
                $scope.isCustomHTML = true;
            }
        };
        
        // Restore default preview HTML
        // ---
        $scope.restoreHTML = function(){
            // Load sample content into the iframe's body.
            $http({method: 'GET', url: 'templates/lib/sample_code.html'}).then(
                // OK.
                function(rsp){
                    Preview.body.innerHTML = rsp.data;
                    $scope.isCustomHTML = false;
                },
                // Error.
                function(){
                    Preview.body.innerHTML = 'Ops, looks like we could not find sample HTML content to load. Just use the Custom HTML tab to fill this area...';
                    $scope.isCustomHTML = false;
                    $log.debug('ERROR LOADING SAMPLE HTML', arguments);
                }
            );
        };
        
        // Handle download.
        // ---
        $scope.download_options = ['CSS', 'CSS minified', 'Less varibles file'];
        $scope.download = function(){
            if( !ChangeSeq.isApplied() && !confirm('There are variables that ware changed but not applied to the preview. Are you sure want to proceed in blind?') )
                return;

            var dModal = $modal.open({
                templateUrl: 'dModal.html',
                controller: dModalCtrl,
                resolve: {
                    download_options: function(){ return $scope.download_options; }
                }
            });
            // When dModal's OK clicked.
            dModal.result.then(function(type){
                switch($scope.download_options.indexOf(type)){
                        // Export compiled CSS as is(ALL modules).
                        case 0:
                            var BS = Preview.getElementById('compiled_less').innerHTML;
                            downloadContent(BS, 'BThemer.css');
                        break;
                        // Export compiled CSS as is minified(ALL modules).
                        case 1:
                            var BS = Preview.getElementById('compiled_less').innerHTML;
                            downloadContent(CSS_min(BS), 'BThemer.min.css');
                        break;
                        // Create and Export variables.less file.
                        case 2:
                            downloadContent(ChangeSeq.makeVarsFile(), 'BThemerVars.less');
                        break;
                }
            });
        }
        // dModal's internal controller.
        var dModalCtrl = function($scope, $modalInstance, download_options){
            $scope.download_options = download_options;
            $scope.selected = {
                opt: $scope.download_options[0]
            };
            // OK.
            $scope.ok = function(){ $modalInstance.close($scope.selected.opt); }
            // Cancel.
            $scope.cancel = function(){ $modalInstance.dismiss('cancel'); }
        }

        // Handle custom build.
        // ---
        $scope.less_files = $LessFiles;
        $scope.custom_buid = function(){
            if( !ChangeSeq.isApplied() && !confirm('There are variables that ware changed but not applied to the preview. Are you sure want to proceed in blind?') )
                return;
            
            var dModalCustom_build = $modal.open({
                templateUrl: 'dModalCustom.html',
                size: 'lg',
                controller: dModalCustomCtrl,
                resolve: {
                    less_files: function(){ return $scope.less_files; }
                }
            });
            // When OK.
            dModalCustom_build.result.then(function(minify_build){
                // Where less resides.
                var b_path = 'bower_components/bootstrap/less/';
                // Include core files.
                var res = '@import "'+b_path+$scope.less_files.core.join("\";\n@import \""+b_path)+"\";\n";
                // Build user selection.
                angular.forEach($scope.less_files, function(files, cat){
                    if( cat!='core' )
                        angular.forEach(files, function(item){
                            if( item.add )
                                res += '@import "'+b_path+item.file+"\";\n";
                        });
                });
                // Append the modified vars
                res+= ChangeSeq.makeVarsFile();
                // Parse and output.
                LESS_parser(res).then(
                    function(css){
                        downloadContent(minify_build? CSS_min(css):css, 'BThemerCustom.css');
                    },
                    function(err){
                        notify(err.message);
                    }
                );
            });
        };
        var dModalCustomCtrl = function($scope, $modalInstance, less_files, minify_build){
            $scope.less_files = less_files;
            $scope.minify_build = false;
            
            // Minify flag updater.
            $scope.minify = function(){
                $scope.minify_build=!$scope.minify_build;
            }

            // Makes sure dependencies and dependents are correct and the custom build can be.
            $scope.checkbox_click = function(item){
                // Filter helper used to manage dependacies and dependants.
                var findIndexByFileName = function(name){
                    var res = {},
                        found = false;
                    angular.forEach($scope.less_files, function(items, cat){
                        angular.forEach(items, function(item, index){
                            if(item.file === name){
                                res.cat = cat;
                                res.index = index;
                                found = true;
                                return;
                            }
                        });
                        if(found)
                            return;
                    });
                    return res;
                };
                //
                switch(item.add){
                        // Adding to the build.
                        case true:
                        // When the file depends on other make sure ohter is included in the build too.
                        if(item.dependencies){
                            angular.forEach(item.dependencies, function(dep){
                                dep = findIndexByFileName(dep);
                                $scope.less_files[dep.cat][dep.index].add = true;
                            });                        
                        }
                        break;
                        // Removing from the build.
                        case false:
                        // When file has dependents exclude them from the build too.
                        if(item.dependents){
                            angular.forEach(item.dependents, function(dep){
                                dep = findIndexByFileName(dep);
                                $scope.less_files[dep.cat][dep.index].add = false;
                            });
                        }
                        break; 
                }
            };

            // OK.
            $scope.ok = function(){ $modalInstance.close($scope.minify_build); }
            // Cancel.
            $scope.cancel = function(){ $modalInstance.dismiss('cancel'); }
        };
}]);