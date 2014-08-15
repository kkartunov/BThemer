(function(root, factory){
    if( typeof define === 'function' && define.amd )
        define(['angular'], factory);
    else
        root.ngLsPersist = factory(root.angular);
}(this, function(angular){
    'use strict';
    
    return angular.module('lsPersist', [])
    .provider('$lsPersist', function(){
        
        // Go out of here if both `localStorage` and `sessionStorage`
        // are not supported. The module will fail to instantiate.
        if( !window.localStorage && !window.sessionStorage )
            return {};

            // Every record made by `lsPersist`
            // will be prefixed with this string!
        var PREFIX = '$',
            PREFIX_LEN = PREFIX.length,
            
            // Current persist destination. Defaults to `localStorage`.
            STORE = window.localStorage,
            STORE_LEN = STORE.length,
            STORE_WHICH = '_LOCAL_';
        
        // Allow change of the `PREFIX`.
        this.setPREFIX = function(val){
            PREFIX = val;
            PREFIX_LEN = PREFIX.length;
            return this;
        };
        
        // Allow switching between `localStorage` <-> `sessionStorage`.
        this.setSTORE = function(val){
            if( val == '_LOCAL_' ){
                STORE = window.localStorage;
                STORE_WHICH = '_LOCAL_';
            }else if( val == '_SESSION_'){
                STORE = window.sessionStorage;
                STORE_WHICH = '_SESSION_';
            }
            
            STORE_LEN = STORE.length;
            return this;
        };
        
        // The `lsPersist` provider implementation.
        this.$get = ['$q', '$rootScope', '$timeout', '$window', '$document', '$log', function($q, $rootScope, $timeout, $window, $document, con){
            
                // Store ref. to configuaration function above.
            var _confCntx = this,

                // Low level API to the `localStorage`/`sessionStorage` methods,
                // wrapped in angular promises way.
                db = {},

                // Raw database primary index.
                // Its strucrure is object with properties == keys in the `localStorage`/`sessionStorage` (without the `PREFIX`)
                // for easy insert/find/delete operations.
                db_index = {},

                // API to access the primary index.
                // Emits `lsPersist.index` event on the $rootScope when the index is changing.
                INDEX = {
                    build: function(){
                        // Reset the index.
                        db_index = {};

                        // Build it.
                        var prefixed_key_name,
                            key_name;

                        for(var i=0; i<STORE_LEN; i++){
                            prefixed_key_name = STORE.key(i);
                            if( prefixed_key_name.substring(0, PREFIX_LEN) == PREFIX ){
                                key_name = prefixed_key_name.substring(PREFIX_LEN);
                                this.add(key_name, {silent: true});
                            }
                        }

                        // Notify about completion.
                        this.eventIt();
                        
                        return this;
                    },
                    
                    // This method will be exposed to the public. Hense the $ sign.
                    $get: function(options){
                        // First build a list of all keys.
                        // TODO: Maybe some cache mechanisum will be good idea.
                        // by Tests made: 1000 keys take 2ms to build and parse and 27ms to buid and sort when strings.
                        var keys = [], prop;                    
                        for(prop in db_index)
                            if( Object.prototype.hasOwnProperty.call(db_index, prop) ){
                                if( options && options.parse==false )
                                    keys.push(prop);
                                else
                                    keys.push( deserialize(prop) );
                            }
                        
                        
                        // Return the list but check if basic sorting of the list (only for string keys) was requested.
                        if( options && options.parse==false )
                            // Sort the list and then return it.
                            if(options.sort)
                                return keys.sort(function(a, b){
                                    try{
                                        return a.localeCompare(b);
                                    }catch(e){
                                        if(a>b) return 1;
                                        if(a<b) return -1;
                                        return 0;
                                    }
                                });
                        
                        return keys;
                    },
                    
                    iterator: function(callback, context, options){
                        angular.forEach(db_index, function(v, key){
                            if( options && options.deserialize )
                                callback.call(context, deserialize(key));
                            else
                                callback.call(context, key);
                        });
                        return this;
                    },

                    add: function(key, options){
                        db_index[key] = 1;

                        if( options && options.silent ){}
                        else
                            this.eventIt();
                        
                        return this;
                    },

                    drop: function(key, options){
                        delete db_index[key];

                        if( options && options.silent ){}
                        else
                            this.eventIt();
                        
                        return this;
                    },

                    eventIt: function(){
                        $timeout(function(){
                            $rootScope.$broadcast('lsPersist.index', db);
                        });
                        
                        return this;
                    }
                },

                // Helpers.
                serialize = angular.toJson,
                deserialize = angular.fromJson,
                err_handler = function(err, deferred){
                    deferred.reject(err);
                    $timeout(function(){
                        $rootScope.$broadcast('lsPersist.error', err);
                    });
                    con.debug('lsPersist::', err);
                },
                storage_event_handler = function(e){
                    // Ensure not bubbling.
                    // Not needed but just to be sure this wont trigger multiple times.
                    e.stopPropagation();
                    
                    // Update `INDEX` according changes occured.
                    // Handle only kev/values managed by us.
                    //
                    // - dropped some item.
                    if( !e.newValue && e.oldValue && e.key.substring(0, PREFIX_LEN) == PREFIX )
                        INDEX.drop(e.key.substring(PREFIX_LEN));
                    // - added some item.
                    if( e.newValue && !e.oldValue && e.key.substring(0, PREFIX_LEN) == PREFIX )
                        INDEX.add(e.key.substring(PREFIX_LEN));
                };

            // Initialize the `INDEX`.
            INDEX.build();
            
            // Listen for STORE changes from other browser tabs via the `storage` event.
            // Browser mish/mash again here, thus we listen for the event on `window` for Chrome,FF,Opera
            // on `document` for IE and on `document.body` for Safari.
            // By spec. the store event does not bubble so this here is working workaround.
            $window.addEventListener('storage', angular.bind(db, storage_event_handler), false);
            document.addEventListener('storage', angular.bind(db, storage_event_handler), false);
            document.body.addEventListener('storage', angular.bind(db, storage_event_handler), false);

            // Create API to access `localStorage`/`sessionStorage` in good controlled and promised fashion.
            // Keys and values will always be automatically serialized/deserialized
            // to/from JSON when writing/reading from the storage.
            // Note that the key de/se - rialization can be disabled! By passing `{serialize: false}` as option.
            angular.extend(db, {

                // Inherit access to some of the methods already implemented.
                getSTORE: function(){return STORE_WHICH;},
                setSTORE: function(val){
                    if( val === STORE_WHICH)
                        return this;
                    
                    _confCntx.setSTORE(val);
                    INDEX.build();
                    return this;
                },
                getPREFIX: function(){return PREFIX;},
                setPREFIX: function(val){
                    if( val === PREFIX )
                        return this;
                    
                    _confCntx.setPREFIX(val);
                    INDEX.build();
                    return this;
                },
                INDEX: INDEX.$get,
                forINDEX: function(callback, options){
                    INDEX.iterator(callback, this, options);
                    return this;
                },
                hasINDEX: function(key){
                    key = (typeof key=='string')? key : serialize(key);
                    return Object.prototype.hasOwnProperty.call(db_index, key);
                },

                // Get item by key name.
                get: function(key, options){
                    var defr = $q.defer(),
                        _key;

                    try{
                        _key = (options && options.serialize==false)? key:serialize(key);
                        defr.resolve(
                            deserialize( STORE.getItem(PREFIX+_key) )
                        );
                    }catch(e){ err_handler(e, defr); }

                    return defr.promise;
                },

                // Set item for key name.
                set: function(key, val, options){

                    if( typeof val === 'undefined' )
                        val = null;

                    var defr = $q.defer(),
                        _key, _val;

                    try{
                        _key = serialize(key);
                        if( !_key )
                            throw new Error('Invalid key');
                        _val = serialize(val);
                        STORE.setItem(PREFIX+_key, _val);

                        INDEX.add(_key);

                        if( options && options.silent ){}
                        else{
                            $timeout(function(){
                                $rootScope.$broadcast('lsPersist.set', {
                                    key: key,
                                    value: val
                                });
                            });
                        }
                        defr.resolve({
                            key: key,
                            value: val
                        });
                    }catch(e){ err_handler(e, defr); }

                    return defr.promise;
                },

                // Delete item by key name.
                drop: function(key, options){
                    var defr = $q.defer(),
                        _key;

                    try{
                        _key = (options && options.serialize==false)? key:serialize(key);
                        STORE.removeItem(PREFIX+_key);

                        INDEX.drop(_key);

                        if( options && options.silent ){}
                        else{
                            $timeout(function(){
                                $rootScope.$broadcast('lsPersist.drop', key);
                            });
                        }
                        defr.resolve(key);
                    }catch(e){ err_handler(e, defr); }

                    return defr.promise;
                },

                // Delete all items in the storage.
                bye: function(options){
                    var defr = $q.defer(),
                        all = [];

                    INDEX.iterator(function(key){
                        all.push( this.drop(key, {silent: true, serialize: false}) );
                    }, this);

                    $q.all(all).then(
                        function(){
                            if( options && options.silent ){}
                            else{
                                $timeout(function(){
                                    $rootScope.$broadcast('lsPersist.bye', db_index);
                                });
                            }
                            defr.resolve();
                        },
                        function(err){
                            defr.reject(err);
                        }
                    );

                    return defr.promise;
                },

                // Export all itmes in the storage.
                dump: function(){
                    var defr = $q.defer(),
                        all_promises = [],
                        collection = [];
                    
                    INDEX.iterator(function(key){
                        all_promises.push( this.get(key, {serialize: false}).then(
                            function(data){
                                collection.push({
                                    key: deserialize(key),
                                    value: data
                                });
                            }
                        ));                        
                    }, this);

                    $q.all(all_promises).then(
                        function(){
                            defr.resolve(collection);
                        },
                        function(err){
                            defr.reject(err);
                        }
                    );

                    return defr.promise;
                }

            });


            // Return public API.
            return db;
            
        }];

    });

}));